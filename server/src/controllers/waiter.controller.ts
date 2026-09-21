import { Request, Response } from "express";
import prisma from "../prisma/client";
import { emitToTable, emitToStaff, emitStockUpdate, emitTableUpdate } from "../socket";

/**
 * GET /api/waiter/tables
 * Retrieve all restaurant floor tables with active session info, order counts, running totals, and status
 */
export const getWaiterTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = await prisma.restaurantTable.findMany({
      where: {
        tableNumber: { not: 999 }, // Exclude takeaway system table
      },
      orderBy: { tableNumber: "asc" },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            orders: {
              include: {
                orderItems: {
                  include: { menuItem: true },
                },
              },
              orderBy: { orderedAt: "asc" },
            },
            payments: true,
          },
        },
      },
    });

    const enrichedTables = tables.map((tbl) => {
      const activeSession = tbl.sessions[0] || null;
      let totalAmount = 0;
      let totalItems = 0;
      let ordersCount = 0;
      let hasReadyOrder = false;

      if (activeSession) {
        ordersCount = activeSession.orders.length;
        activeSession.orders.forEach((ord) => {
          if (ord.status === "READY") {
            hasReadyOrder = true;
          }
          ord.orderItems.forEach((oi) => {
            totalItems += oi.quantity;
            totalAmount += Number(oi.subtotal);
          });
        });
      }

      return {
        id: tbl.id,
        tableNumber: tbl.tableNumber,
        capacity: tbl.capacity,
        status: tbl.status,
        qrCodeToken: tbl.qrCodeToken,
        hasReadyOrder,
        activeSession: activeSession
          ? {
              id: activeSession.id,
              sessionCode: activeSession.sessionCode,
              startTime: activeSession.startTime,
              guestCount: activeSession.guestCount,
              ordersCount,
              totalItems,
              totalAmount: Number(totalAmount.toFixed(2)),
              orders: activeSession.orders,
            }
          : null,
      };
    });

    res.json({ tables: enrichedTables });
  } catch (error) {
    console.error("Error fetching waiter floor tables:", error);
    res.status(500).json({ message: "Failed to fetch floor tables" });
  }
};

/**
 * GET /api/waiter/table/:tableNumber
 * Detailed table view with active session, itemized orders, and calculated bill preview
 */
export const getWaiterTableDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = Number(req.params.tableNumber);
    if (isNaN(tableNumber)) {
      res.status(400).json({ message: "Valid table number is required." });
      return;
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { tableNumber },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            orders: {
              include: {
                orderItems: {
                  include: {
                    menuItem: {
                      include: { category: true },
                    },
                  },
                },
              },
              orderBy: { orderedAt: "desc" },
            },
            payments: true,
          },
        },
      },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found.` });
      return;
    }

    const activeSession = table.sessions[0] || null;
    let subtotal = 0;
    let totalItems = 0;
    const aggregatedItemsMap = new Map<number, { menuItem: any; quantity: number; subtotal: number }>();

    if (activeSession) {
      activeSession.orders.forEach((ord) => {
        if (ord.status !== "CANCELLED") {
          ord.orderItems.forEach((oi) => {
            totalItems += oi.quantity;
            const itemSub = Number(oi.subtotal);
            subtotal += itemSub;

            const existing = aggregatedItemsMap.get(oi.menuItemId);
            if (existing) {
              existing.quantity += oi.quantity;
              existing.subtotal += itemSub;
            } else {
              aggregatedItemsMap.set(oi.menuItemId, {
                menuItem: oi.menuItem,
                quantity: oi.quantity,
                subtotal: itemSub,
              });
            }
          });
        }
      });
    }

    // 5% GST standard (2.5% CGST + 2.5% SGST)
    const cgst = Number((subtotal * 0.025).toFixed(2));
    const sgst = Number((subtotal * 0.025).toFixed(2));
    const grandTotal = Number((subtotal + cgst + sgst).toFixed(2));

    res.json({
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
      activeSession,
      billPreview: {
        totalItems,
        subtotal: Number(subtotal.toFixed(2)),
        cgst,
        sgst,
        tax: Number((cgst + sgst).toFixed(2)),
        grandTotal,
        aggregatedItems: Array.from(aggregatedItemsMap.values()),
      },
    });
  } catch (error) {
    console.error("Error fetching waiter table detail:", error);
    res.status(500).json({ message: "Failed to fetch table details" });
  }
};

/**
 * PATCH /api/waiter/table/:tableNumber/status
 * Waiter updates table status (AVAILABLE, OCCUPIED, BILLING, CLEANING)
 */
export const updateWaiterTableStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = Number(req.params.tableNumber);
    const { status } = req.body;

    const validStatuses = ["AVAILABLE", "OCCUPIED", "BILLING", "CLEANING"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { tableNumber },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found.` });
      return;
    }

    const updated = await prisma.restaurantTable.update({
      where: { id: table.id },
      data: { status },
    });

    // Real-time broadcast to floor and staff channels
    emitTableUpdate(updated);
    emitToStaff("table:status_change", {
      tableNumber,
      status,
      updatedAt: new Date(),
    });

    res.json({ success: true, table: updated });
  } catch (error) {
    console.error("Error updating table status by waiter:", error);
    res.status(500).json({ message: "Failed to update table status" });
  }
};

/**
 * POST /api/waiter/order
 * Waiter places order for a table (creates active session if needed, checks stock, deducts Auto-86, dispatches to KDS)
 */
export const placeWaiterOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, items, notes } = req.body;

    if (!tableNumber) {
      res.status(400).json({ message: "Table number is required." });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "Please specify items to order." });
      return;
    }

    const num = Number(tableNumber);
    const table = await prisma.restaurantTable.findUnique({
      where: { tableNumber: num },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found.` });
      return;
    }

    // Ensure an ACTIVE dining session exists
    let activeSession = table.sessions[0];
    if (!activeSession) {
      const sessionCode = `SESS-T${num}-${Date.now().toString().slice(-6)}`;
      activeSession = await prisma.diningSession.create({
        data: {
          tableId: table.id,
          sessionCode,
          status: "ACTIVE",
          totalAmount: 0,
        },
      });

      // Switch table to OCCUPIED
      await prisma.restaurantTable.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });

      emitTableUpdate({
        id: table.id,
        tableNumber: table.tableNumber,
        status: "OCCUPIED",
        capacity: table.capacity,
      });
    }

    // Validate items and stock
    const itemIds = items.map((i: any) => Number(i.menuItemId));
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
      include: { inventory: true },
    });

    const itemMap = new Map(dbItems.map((item) => [item.id, item]));

    for (const orderItem of items) {
      const dbItem = itemMap.get(Number(orderItem.menuItemId));
      if (!dbItem) {
        res.status(400).json({ message: `Item ID ${orderItem.menuItemId} not found.` });
        return;
      }
      if (!dbItem.isAvailable) {
        res.status(400).json({ message: `"${dbItem.name}" is sold out.` });
        return;
      }
      if (dbItem.inventory && dbItem.inventory.remainingQty < Number(orderItem.quantity)) {
        res.status(400).json({
          message: `Only ${dbItem.inventory.remainingQty} left for "${dbItem.name}".`,
        });
        return;
      }
    }

    // Calculate totals and deduct stock
    let orderSubtotal = 0;
    const orderItemsData: Array<{
      menuItemId: number;
      quantity: number;
      price: number;
      subtotal: number;
    }> = [];

    for (const orderItem of items) {
      const dbItem = itemMap.get(Number(orderItem.menuItemId))!;
      const qty = Number(orderItem.quantity);
      const price = Number(dbItem.price);
      const subtotal = price * qty;
      orderSubtotal += subtotal;

      orderItemsData.push({
        menuItemId: dbItem.id,
        quantity: qty,
        price,
        subtotal,
      });

      // Deduct inventory
      if (dbItem.inventory) {
        const newQty = Math.max(0, dbItem.inventory.remainingQty - qty);
        const newAvailable = newQty > 0;

        await prisma.inventory.update({
          where: { menuItemId: dbItem.id },
          data: {
            remainingQty: newQty,
            isAvailable: newAvailable,
          },
        });

        if (!newAvailable) {
          await prisma.menuItem.update({
            where: { id: dbItem.id },
            data: { isAvailable: false },
          });
        }

        emitStockUpdate(dbItem.id, newQty, newAvailable);
      }
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder = await prisma.order.create({
      data: {
        diningSessionId: activeSession.id,
        orderNumber,
        status: "PENDING",
        notes: notes ? `[Waiter Order] ${notes}` : "[Waiter Order]",
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              include: { category: true },
            },
          },
        },
        diningSession: {
          include: {
            table: true,
          },
        },
      },
    });

    // Update dining session running total
    await prisma.diningSession.update({
      where: { id: activeSession.id },
      data: {
        totalAmount: { increment: orderSubtotal },
      },
    });

    // Real-time broadcasts:
    // 1. Kitchen KDS
    emitToStaff("order:new", newOrder);
    // 2. Table room
    emitToTable(num, "order:new", newOrder);
    // 3. Table update event
    emitTableUpdate({
      id: table.id,
      tableNumber: table.tableNumber,
      status: "OCCUPIED",
      capacity: table.capacity,
    });

    res.status(201).json({
      success: true,
      message: `Order #${newOrder.orderNumber} dispatched to kitchen successfully!`,
      order: newOrder,
    });
  } catch (error) {
    console.error("Error placing waiter order:", error);
    res.status(500).json({ message: "Failed to place order" });
  }
};

/**
 * PATCH /api/waiter/order/:orderId/status
 * Waiter advances order status (PENDING -> PREPARING -> READY -> SERVED -> CANCELLED)
 */
export const updateWaiterOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = Number(req.params.orderId);
    const { status } = req.body;

    const validStatuses = ["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        diningSession: {
          include: {
            table: true,
          },
        },
      },
    });

    if (!existingOrder) {
      res.status(404).json({ message: `Order #${orderId} not found.` });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
        diningSession: {
          include: { table: true },
        },
      },
    });

    const tableNum = existingOrder.diningSession.table.tableNumber;

    emitToStaff("order:status_update", {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      tableNumber: tableNum,
      order: updated,
    });

    if (updated.status === "SERVED") {
      emitToStaff("order:served", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        tableNumber: tableNum,
      });
    }

    emitToTable(tableNum, "order:status_update", {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
    });

    res.json({
      success: true,
      message: `Order #${updated.orderNumber} updated to ${updated.status}`,
      order: updated,
    });
  } catch (error) {
    console.error("Error updating waiter order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

/**
 * POST /api/waiter/table/:tableNumber/request-bill
 * Waiter flags table for billing and triggers cashier notification & chime
 */
export const requestWaiterBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = Number(req.params.tableNumber);

    const table = await prisma.restaurantTable.findUnique({
      where: { tableNumber },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found.` });
      return;
    }

    // Update table status to BILLING
    const updated = await prisma.restaurantTable.update({
      where: { id: table.id },
      data: { status: "BILLING" },
    });

    emitTableUpdate(updated);

    // Alert cashier & staff
    emitToStaff("service:alert", {
      tableNumber,
      type: "REQUEST_BILL",
      message: `Waiter requested final bill for Table #${tableNumber}`,
      timestamp: new Date(),
    });

    emitToTable(tableNumber, "service:acknowledged", {
      type: "REQUEST_BILL",
      message: "Bill requested! Cashier has been alerted.",
    });

    res.json({
      success: true,
      message: `Bill requested for Table #${tableNumber}. Cashier alerted.`,
      table: updated,
    });
  } catch (error) {
    console.error("Error requesting waiter bill:", error);
    res.status(500).json({ message: "Failed to request bill" });
  }
};
