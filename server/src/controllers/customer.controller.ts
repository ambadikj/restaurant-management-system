import { Request, Response } from "express";
import prisma from "../prisma/client";
import { emitToTable, emitToStaff, emitStockUpdate } from "../socket";

/**
 * GET /api/customer/menu
 * Public menu with categories, dishes, and real-time inventory availability
 */
export const getPublicMenu = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        menuItems: {
          include: {
            inventory: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Error fetching public menu:", error);
    res.status(500).json({ message: "Failed to load restaurant menu" });
  }
};

/**
 * GET /api/customer/table/:tableNumber
 * Verify table number and retrieve table status + active dining session
 */
export const getTableInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = req.params.tableNumber;
    const isTakeaway = String(raw).toLowerCase() === "takeaway";

    if (isTakeaway) {
      res.json({
        isTakeaway: true,
        tableNumber: "Takeaway",
        capacity: 0,
        status: "AVAILABLE",
        activeSession: null,
      });
      return;
    }

    const tableNumber = Number(raw);
    if (isNaN(tableNumber)) {
      res.status(400).json({ message: "Invalid table number" });
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
                  include: { menuItem: true },
                },
              },
              orderBy: { orderedAt: "desc" },
            },
          },
        },
      },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found.` });
      return;
    }

    const activeSession = table.sessions[0] || null;

    res.json({
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
      activeSession,
    });
  } catch (error) {
    console.error("Error fetching table info:", error);
    res.status(500).json({ message: "Error verifying table status" });
  }
};

/**
 * POST /api/customer/order
 * Place customer order, deduct inventory stock (Auto-86), link to dining session,
 * and broadcast real-time events via Socket.IO
 */
export const placeOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "Please select at least one item to order." });
      return;
    }

    const isTakeaway = String(tableNumber).toLowerCase() === "takeaway";
    let targetTable: any = null;

    if (!isTakeaway) {
      const num = Number(tableNumber);
      targetTable = await prisma.restaurantTable.findUnique({
        where: { tableNumber: num },
        include: {
          sessions: {
            where: { status: "ACTIVE" },
            take: 1,
          },
        },
      });

      if (!targetTable) {
        res.status(404).json({ message: `Table ${tableNumber} does not exist.` });
        return;
      }
    } else {
      // Find or create a designated Takeaway table record
      targetTable = await prisma.restaurantTable.findFirst({
        where: { tableNumber: 999 },
        include: {
          sessions: {
            where: { status: "ACTIVE" },
            take: 1,
          },
        },
      });

      if (!targetTable) {
        targetTable = await prisma.restaurantTable.create({
          data: {
            tableNumber: 999,
            capacity: 100,
            status: "AVAILABLE",
            qrCodeToken: "takeaway-universal-token",
          },
          include: { sessions: true },
        });
      }
    }

    // Ensure an ACTIVE dining session exists for this table
    let activeSession = targetTable.sessions?.[0];
    if (!activeSession) {
      const sessionCode = `SESS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      activeSession = await prisma.diningSession.create({
        data: {
          tableId: targetTable.id,
          sessionCode,
          status: "ACTIVE",
          totalAmount: 0,
        },
      });

      // Update table to OCCUPIED
      if (!isTakeaway) {
        await prisma.restaurantTable.update({
          where: { id: targetTable.id },
          data: { status: "OCCUPIED" },
        });
      }
    }

    // Extract item IDs and validate in database
    const itemIds = items.map((i: any) => Number(i.menuItemId));
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
      include: { inventory: true },
    });

    const itemMap = new Map(dbItems.map((item) => [item.id, item]));

    // Pre-validate stock availability
    for (const orderItem of items) {
      const dbItem = itemMap.get(Number(orderItem.menuItemId));
      if (!dbItem) {
        res.status(400).json({ message: `Item ID ${orderItem.menuItemId} was not found.` });
        return;
      }

      if (!dbItem.isAvailable) {
        res.status(400).json({ message: `"${dbItem.name}" is currently unavailable / sold out.` });
        return;
      }

      if (dbItem.inventory) {
        if (dbItem.inventory.remainingQty < orderItem.quantity) {
          res.status(400).json({
            message: `Only ${dbItem.inventory.remainingQty} portion(s) remaining for "${dbItem.name}".`,
          });
          return;
        }
      }
    }

    // Execute atomic transaction: Create Order + OrderItems + Update Stock + Update Session
    const orderNumber = `ORD-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    const updatedStockEvents: { menuItemId: number; remainingQty: number; isAvailable: boolean }[] = [];

    const createdOrder = await prisma.$transaction(async (tx) => {
      let orderTotal = 0;
      const orderItemsData: any[] = [];

      for (const orderItem of items) {
        const dbItem = itemMap.get(Number(orderItem.menuItemId))!;
        const qty = Number(orderItem.quantity);
        const price = Number(dbItem.price);
        const subtotal = price * qty;
        orderTotal += subtotal;

        orderItemsData.push({
          menuItemId: dbItem.id,
          quantity: qty,
          price: dbItem.price,
          subtotal,
        });

        // Decrement stock if inventory record exists (Auto-86)
        if (dbItem.inventory) {
          const newRemaining = Math.max(0, dbItem.inventory.remainingQty - qty);
          const isNowAvailable = newRemaining > 0;

          await tx.inventory.update({
            where: { menuItemId: dbItem.id },
            data: {
              remainingQty: newRemaining,
              isAvailable: isNowAvailable,
            },
          });

          // Auto-86 on menuItem table if stock hits 0
          if (!isNowAvailable) {
            await tx.menuItem.update({
              where: { id: dbItem.id },
              data: { isAvailable: false },
            });
          }

          updatedStockEvents.push({
            menuItemId: dbItem.id,
            remainingQty: newRemaining,
            isAvailable: isNowAvailable,
          });
        }
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          diningSessionId: activeSession.id,
          orderNumber,
          notes: notes?.trim() || null,
          status: "PENDING",
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: {
            include: { menuItem: true },
          },
        },
      });

      // Update DiningSession totalAmount
      const updatedTotal = Number(activeSession.totalAmount) + orderTotal;
      await tx.diningSession.update({
        where: { id: activeSession.id },
        data: { totalAmount: updatedTotal },
      });

      return newOrder;
    });

    // Real-Time Socket.IO broadcasts
    const displayTable = isTakeaway ? "Takeaway" : targetTable.tableNumber;

    // 1. Notify table room that order was placed
    emitToTable(displayTable, "order:placed", {
      order: createdOrder,
      tableNumber: displayTable,
    });

    // 2. Alert kitchen / POS staff of new order
    emitToStaff("order:new", {
      order: createdOrder,
      tableNumber: displayTable,
      tableName: isTakeaway ? "Takeaway Order" : `Table ${displayTable}`,
    });

    // 3. Broadcast stock changes for Auto-86 sync
    for (const stockEv of updatedStockEvents) {
      emitStockUpdate(stockEv.menuItemId, stockEv.remainingQty, stockEv.isAvailable);
    }

    res.status(201).json({
      message: "Order placed successfully!",
      order: createdOrder,
      tableNumber: displayTable,
    });
  } catch (error: any) {
    console.error("Error placing customer order:", error);
    res.status(500).json({ message: error.message || "Failed to submit order." });
  }
};

/**
 * GET /api/customer/session/:tableNumber
 * Retrieve all orders and live status for current table session
 */
export const getSessionOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = req.params.tableNumber;
    const isTakeaway = String(raw).toLowerCase() === "takeaway";
    const tableNumber = isTakeaway ? 999 : Number(raw);

    const table = await prisma.restaurantTable.findFirst({
      where: { tableNumber },
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
              orderBy: { orderedAt: "desc" },
            },
          },
        },
      },
    });

    if (!table || !table.sessions[0]) {
      res.json({
        activeSession: null,
        orders: [],
        totalAmount: 0,
      });
      return;
    }

    const session = table.sessions[0];
    res.json({
      activeSession: {
        id: session.id,
        sessionCode: session.sessionCode,
        startTime: session.startTime,
        status: session.status,
        totalAmount: session.totalAmount,
      },
      orders: session.orders,
      tableStatus: table.status,
    });
  } catch (error) {
    console.error("Error fetching session orders:", error);
    res.status(500).json({ message: "Failed to load orders." });
  }
};

/**
 * POST /api/customer/service
 * Customer calls waiter or requests final bill
 */
export const requestService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, type, message } = req.body;
    const isTakeaway = String(tableNumber).toLowerCase() === "takeaway";
    const displayTable = isTakeaway ? "Takeaway" : Number(tableNumber);

    if (type === "REQUEST_BILL" && !isTakeaway) {
      const table = await prisma.restaurantTable.findUnique({
        where: { tableNumber: Number(tableNumber) },
      });

      if (table) {
        await prisma.restaurantTable.update({
          where: { id: table.id },
          data: { status: "BILLING" },
        });
      }
    }

    // Broadcast service request to staff
    emitToStaff("service:alert", {
      tableNumber: displayTable,
      type, // 'CALL_WAITER' | 'REQUEST_BILL'
      message: message || (type === "REQUEST_BILL" ? "Customer requested the bill" : "Customer called for assistance"),
      timestamp: new Date(),
    });

    // Notify table room
    emitToTable(displayTable, "service:acknowledged", {
      type,
      message: "Staff has been notified and is on the way!",
    });

    res.json({ success: true, message: "Staff notified successfully!" });
  } catch (error) {
    console.error("Error requesting service:", error);
    res.status(500).json({ message: "Failed to alert staff." });
  }
};
