import { Request, Response } from "express";
import prisma from "../prisma/client";
import { emitToTable, emitToStaff, emitTableUpdate } from "../socket";
import crypto from "crypto";

// In-memory store for real-time QR scan access requests waiting for cashier approval
interface AccessRequest {
  tableNumber: number;
  requestedAt: Date;
  guestCount?: number;
}

const pendingAccessRequests: Map<number, AccessRequest> = new Map();

/**
 * GET /api/cashier/tables
 * Retrieve all restaurant tables with live occupancy, active dining session,
 * running totals, and pending QR scan access status
 */
export const getCashierTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = await prisma.restaurantTable.findMany({
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

      if (activeSession) {
        ordersCount = activeSession.orders.length;
        activeSession.orders.forEach((ord) => {
          ord.orderItems.forEach((oi) => {
            totalItems += oi.quantity;
            totalAmount += Number(oi.subtotal);
          });
        });
      }

      const hasPendingAccess = pendingAccessRequests.has(tbl.tableNumber);

      return {
        id: tbl.id,
        tableNumber: tbl.tableNumber,
        capacity: tbl.capacity,
        status: tbl.status,
        qrCodeToken: tbl.qrCodeToken,
        hasPendingAccess,
        pendingAccessInfo: hasPendingAccess ? pendingAccessRequests.get(tbl.tableNumber) : null,
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

    res.json({
      tables: enrichedTables,
      pendingRequests: Array.from(pendingAccessRequests.values()),
    });
  } catch (error) {
    console.error("Error fetching cashier tables:", error);
    res.status(500).json({ message: "Failed to fetch tables floor data" });
  }
};

/**
 * PATCH /api/cashier/table/:tableNumber/status
 * Cashier manually updates table status (AVAILABLE, OCCUPIED, BILLING, CLEANING)
 */
export const updateCashierTableStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = Number(req.params.tableNumber);
    const { status } = req.body;

    if (!status || !["AVAILABLE", "OCCUPIED", "BILLING", "CLEANING"].includes(status)) {
      res.status(400).json({ message: "Invalid table status" });
      return;
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { tableNumber },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found` });
      return;
    }

    const updated = await prisma.restaurantTable.update({
      where: { id: table.id },
      data: { status },
    });

    // Broadcast table update
    emitTableUpdate(updated);

    res.json({ success: true, table: updated });
  } catch (error) {
    console.error("Error updating table status:", error);
    res.status(500).json({ message: "Failed to update table status" });
  }
};

/**
 * POST /api/cashier/table/:tableNumber/request-access
 * Customer scans QR code and requests cashier authorization to access menu
 */
export const requestTableAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = Number(req.params.tableNumber);
    const { guestCount, sessionCode } = req.body;

    const table = await prisma.restaurantTable.findUnique({
      where: { tableNumber },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found` });
      return;
    }

    // If client provides a valid sessionCode that matches an active session for this table,
    // they are already authorized from a previous cashier approval during this meal.
    if (sessionCode && table.sessions.length > 0) {
      const existingSession = table.sessions.find((s) => s.sessionCode === sessionCode);
      if (existingSession) {
        res.json({
          authorized: true,
          alreadyActive: true,
          message: "Table session is active and verified",
          session: existingSession,
        });
        return;
      }
    }

    // Otherwise, this is a new scan / unauthorized access. Register request & alert Cashier terminal.
    const isAlreadyPending = pendingAccessRequests.has(tableNumber);
    if (!isAlreadyPending) {
      const requestItem: AccessRequest = {
        tableNumber,
        requestedAt: new Date(),
        guestCount: guestCount ? Number(guestCount) : undefined,
      };
      pendingAccessRequests.set(tableNumber, requestItem);

      // Broadcast live access request alert to Cashier & Staff once
      emitToStaff("cashier:access_request", {
        tableNumber,
        requestedAt: requestItem.requestedAt,
        guestCount: requestItem.guestCount,
        capacity: table.capacity,
        status: table.status,
      });
    }

    res.json({
      authorized: false,
      pendingApproval: true,
      message: "Access request sent to cashier. Please wait for staff authorization.",
    });
  } catch (error) {
    console.error("Error requesting table access:", error);
    res.status(500).json({ message: "Failed to request table access" });
  }
};

/**
 * POST /api/cashier/table/:tableNumber/approve-access
 * Cashier approves customer's QR scan access request
 */
export const approveTableAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = Number(req.params.tableNumber);

    const table = await prisma.restaurantTable.findUnique({
      where: { tableNumber },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found` });
      return;
    }

    // Remove from pending map
    pendingAccessRequests.delete(tableNumber);

    // Check if session already exists, otherwise create one
    let session = table.sessions[0];
    if (!session) {
      const sessionCode = `SESS-T${tableNumber}-${Date.now().toString().slice(-6)}`;
      session = await prisma.diningSession.create({
        data: {
          tableId: table.id,
          sessionCode,
          status: "ACTIVE",
          totalAmount: 0.0,
        },
      });
    }

    // Set table status to OCCUPIED
    const updatedTable = await prisma.restaurantTable.update({
      where: { id: table.id },
      data: { status: "OCCUPIED" },
    });

    // Notify customer table room that access is granted!
    emitToTable(tableNumber, "table:access_granted", {
      tableNumber,
      sessionCode: session.sessionCode,
      message: "Access granted! Welcome to Serve_Sync.",
    });

    // Broadcast table update to floor
    emitTableUpdate(updatedTable);
    emitToStaff("cashier:access_handled", { tableNumber, action: "APPROVED" });

    res.json({
      success: true,
      message: `Table #${tableNumber} access approved successfully`,
      table: updatedTable,
      session,
    });
  } catch (error) {
    console.error("Error approving table access:", error);
    res.status(500).json({ message: "Failed to approve table access" });
  }
};

/**
 * POST /api/cashier/table/:tableNumber/decline-access
 * Cashier declines customer's QR scan access request
 */
export const declineTableAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = Number(req.params.tableNumber);

    pendingAccessRequests.delete(tableNumber);

    // Notify customer room
    emitToTable(tableNumber, "table:access_declined", {
      tableNumber,
      message: "Access request was declined by staff. Please speak to a host.",
    });

    emitToStaff("cashier:access_handled", { tableNumber, action: "DECLINED" });

    res.json({ success: true, message: `Access request for Table #${tableNumber} declined.` });
  } catch (error) {
    console.error("Error declining table access:", error);
    res.status(500).json({ message: "Failed to decline table access" });
  }
};

/**
 * GET /api/cashier/session/:sessionId/bill
 * Retrieve itemized bill summary, taxes, and payments for a dining session
 */
export const getSessionBillDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = Number(req.params.sessionId);

    const session = await prisma.diningSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
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
    });

    if (!session) {
      res.status(404).json({ message: "Dining session not found" });
      return;
    }

    // Consolidate identical items across multiple order courses
    const consolidatedItemsMap = new Map<number, {
      menuItemId: number;
      name: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }>();

    let subtotal = 0;

    session.orders.forEach((order) => {
      // Don't include cancelled orders in the bill
      if (order.status === "CANCELLED") return;

      order.orderItems.forEach((oi) => {
        const price = Number(oi.price);
        const itemSubtotal = Number(oi.subtotal);
        subtotal += itemSubtotal;

        if (consolidatedItemsMap.has(oi.menuItemId)) {
          const existing = consolidatedItemsMap.get(oi.menuItemId)!;
          existing.quantity += oi.quantity;
          existing.subtotal += itemSubtotal;
        } else {
          consolidatedItemsMap.set(oi.menuItemId, {
            menuItemId: oi.menuItemId,
            name: oi.menuItem.name,
            unitPrice: price,
            quantity: oi.quantity,
            subtotal: itemSubtotal,
          });
        }
      });
    });

    const items = Array.from(consolidatedItemsMap.values());
    const taxRate = 0.05; // 5% GST
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const grandTotal = Number((subtotal + taxAmount).toFixed(2));

    const totalPaid = session.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = Math.max(0, Number((grandTotal - totalPaid).toFixed(2)));

    res.json({
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        tableNumber: session.table?.tableNumber || "Takeaway",
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
      },
      items,
      subtotal: Number(subtotal.toFixed(2)),
      taxRate: 5,
      taxAmount,
      discount: 0,
      grandTotal,
      totalPaid: Number(totalPaid.toFixed(2)),
      balanceDue,
      payments: session.payments,
      orders: session.orders,
    });
  } catch (error) {
    console.error("Error fetching bill details:", error);
    res.status(500).json({ message: "Failed to generate bill details" });
  }
};

/**
 * POST /api/cashier/settle
 * Settle a dining session bill with support for Split Payments (Cash + UPI + Card)
 */
export const settleBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sessionId,
      tableNumber,
      payments, // Array<{ method: "CASH" | "CARD" | "UPI", amount: number }>
      discount = 0,
      notes,
    } = req.body;

    if (!sessionId || !payments || !Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({ message: "Please provide valid session and payment details." });
      return;
    }

    const session = await prisma.diningSession.findUnique({
      where: { id: Number(sessionId) },
      include: {
        table: true,
        orders: {
          include: {
            orderItems: {
              include: { menuItem: true },
            },
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ message: "Dining session not found." });
      return;
    }

    // Calculate grand total from order items
    let subtotal = 0;
    session.orders.forEach((ord) => {
      if (ord.status !== "CANCELLED") {
        ord.orderItems.forEach((oi) => {
          subtotal += Number(oi.subtotal);
        });
      }
    });

    const taxAmount = Number((subtotal * 0.05).toFixed(2));
    const netGrandTotal = Math.max(0, Number((subtotal + taxAmount - Number(discount || 0)).toFixed(2)));

    // Verify payments cover the total
    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    if (Math.abs(totalPaid - netGrandTotal) > 1.0 && totalPaid < netGrandTotal) {
      res.status(400).json({
        message: `Payment amount ₹${totalPaid.toFixed(2)} is less than bill amount ₹${netGrandTotal.toFixed(2)}`,
      });
      return;
    }

    // Atomic transaction: Create payment records, complete session, and reset table
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record for each split method
      const createdPayments = [];
      for (const p of payments) {
        if (Number(p.amount) > 0) {
          const pm = await tx.payment.create({
            data: {
              diningSessionId: session.id,
              amount: Number(p.amount),
              paymentMethod: p.method,
              paymentStatus: "PAID",
              paidAt: new Date(),
            },
          });
          createdPayments.push(pm);
        }
      }

      // 2. Mark session COMPLETED
      const updatedSession = await tx.diningSession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
          endTime: new Date(),
          totalAmount: netGrandTotal,
        },
      });

      // 3. Mark all pending/preparing orders as SERVED if completed
      await tx.order.updateMany({
        where: {
          diningSessionId: session.id,
          status: { in: ["PENDING", "PREPARING", "READY"] },
        },
        data: { status: "SERVED" },
      });

      // 4. Free the table if it is a dine-in table
      let freedTable = null;
      if (session.tableId) {
        freedTable = await tx.restaurantTable.update({
          where: { id: session.tableId },
          data: { status: "AVAILABLE" },
        });
      }

      return { createdPayments, updatedSession, freedTable };
    });

    // Notify customer table room via WebSockets
    const displayTable = session.table ? session.table.tableNumber : tableNumber || "Takeaway";
    emitToTable(displayTable, "session:settled", {
      tableNumber: displayTable,
      sessionCode: session.sessionCode,
      grandTotal: netGrandTotal,
      payments,
      message: "Bill settled! Thank you for dining with us.",
    });

    // Broadcast table update to floor
    if (result.freedTable) {
      emitTableUpdate(result.freedTable);
    }

    emitToStaff("cashier:bill_settled", {
      tableNumber: displayTable,
      sessionId: session.id,
      grandTotal: netGrandTotal,
      payments,
    });

    res.json({
      success: true,
      message: "Bill settled successfully!",
      receipt: {
        invoiceNumber: `INV-${session.sessionCode}`,
        tableNumber: displayTable,
        dateTime: new Date(),
        subtotal,
        taxAmount,
        discount: Number(discount || 0),
        grandTotal: netGrandTotal,
        payments,
        items: session.orders.flatMap((o) =>
          o.orderItems.map((oi) => ({
            name: oi.menuItem.name,
            quantity: oi.quantity,
            price: Number(oi.price),
            subtotal: Number(oi.subtotal),
          }))
        ),
      },
    });
  } catch (error) {
    console.error("Error settling bill:", error);
    res.status(500).json({ message: "Failed to settle bill." });
  }
};

/**
 * POST /api/cashier/takeaway
 * Fast POS creator for walk-in takeaway orders with immediate settlement
 */
export const createTakeawayBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerName,
      customerPhone,
      items, // Array<{ menuItemId: number, quantity: number, notes?: string }>
      payments, // Array<{ method: "CASH" | "CARD" | "UPI", amount: number }>
      discount = 0,
      packagingCharge = 0,
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "Please select at least one item." });
      return;
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({ message: "Payment details required." });
      return;
    }

    // Fetch items with price and inventory
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { inventory: true },
    });

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Validate availability & calculate total
    let subtotal = 0;
    const validatedItems: Array<{
      menuItemId: number;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const dish = itemMap.get(item.menuItemId);
      if (!dish) {
        res.status(400).json({ message: `Item ID ${item.menuItemId} not found.` });
        return;
      }
      if (!dish.isAvailable || (dish.inventory && dish.inventory.remainingQty < item.quantity)) {
        res.status(400).json({ message: `"${dish.name}" does not have sufficient stock.` });
        return;
      }

      const price = Number(dish.price);
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;
      validatedItems.push({
        menuItemId: dish.id,
        name: dish.name,
        price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    const taxAmount = Number((subtotal * 0.05).toFixed(2));
    const pkgCharge = Number(packagingCharge || 0);
    const grandTotal = Number((subtotal + taxAmount + pkgCharge - Number(discount || 0)).toFixed(2));

    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    if (Math.abs(totalPaid - grandTotal) > 1.0 && totalPaid < grandTotal) {
      res.status(400).json({
        message: `Payment amount ₹${totalPaid.toFixed(2)} is less than total ₹${grandTotal.toFixed(2)}`,
      });
      return;
    }

    // Transaction to create session, order, payment & deduct stock
    const sessionCode = `TAKEAWAY-${Date.now().toString().slice(-6)}`;
    const orderNumber = `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    const phonePart = customerPhone ? ` | Ph: ${customerPhone}` : "";
    const headerPart = `[Takeaway: ${customerName || "Customer"}${phonePart}]`;
    const fullNotes = notes ? `${headerPart} ${notes}` : headerPart;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Takeaway Table or virtual session (tableId: 1 or dedicated)
      let takeawayTable = await tx.restaurantTable.findFirst({
        where: { tableNumber: 999 },
      });

      if (!takeawayTable) {
        takeawayTable = await tx.restaurantTable.create({
          data: {
            tableNumber: 999,
            capacity: 0,
            status: "AVAILABLE",
            qrCodeToken: `takeaway-${crypto.randomUUID()}`,
          },
        });
      }

      // 2. Create DiningSession
      const session = await tx.diningSession.create({
        data: {
          tableId: takeawayTable.id,
          sessionCode,
          status: "COMPLETED",
          startTime: new Date(),
          endTime: new Date(),
          totalAmount: grandTotal,
        },
      });

      // 3. Create Order
      const order = await tx.order.create({
        data: {
          diningSessionId: session.id,
          orderNumber,
          status: "PREPARING", // Send directly to kitchen!
          notes: fullNotes,
          orderedAt: new Date(),
        },
      });

      // 4. Create OrderItems & deduct stock
      for (const vi of validatedItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: vi.menuItemId,
            quantity: vi.quantity,
            price: vi.price,
            subtotal: vi.subtotal,
          },
        });

        // Deduct inventory
        const dish = itemMap.get(vi.menuItemId);
        if (dish?.inventory) {
          const newQty = Math.max(0, dish.inventory.remainingQty - vi.quantity);
          await tx.inventory.update({
            where: { menuItemId: vi.menuItemId },
            data: {
              remainingQty: newQty,
              isAvailable: newQty > 0,
            },
          });
        }
      }

      // 5. Create Payments
      for (const p of payments) {
        if (Number(p.amount) > 0) {
          await tx.payment.create({
            data: {
              diningSessionId: session.id,
              amount: Number(p.amount),
              paymentMethod: p.method,
              paymentStatus: "PAID",
              paidAt: new Date(),
            },
          });
        }
      }

      return { session, order };
    });

    // Query full order with relations for seamless KDS real-time display
    const fullOrder = await prisma.order.findUnique({
      where: { id: result.order.id },
      include: {
        diningSession: {
          include: {
            table: true,
            payments: true,
          },
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Broadcast new order to Kitchen Display System & Staff channels
    emitToStaff("order:new", {
      order: fullOrder || result.order,
      tableNumber: 999,
      tableName: "Takeaway",
    });

    emitToStaff("order:placed", {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      tableNumber: "Takeaway",
      status: "PREPARING",
      notes: result.order.notes,
      items: validatedItems,
      order: fullOrder,
    });

    res.status(201).json({
      success: true,
      message: "Takeaway order created, paid, and dispatched to kitchen!",
      receipt: {
        invoiceNumber: `INV-${sessionCode}`,
        orderId: result.order.id,
        orderNumber,
        customerName: customerName || "Guest",
        customerPhone: customerPhone || "",
        tableNumber: "Takeaway",
        dateTime: new Date(),
        subtotal,
        taxAmount,
        packagingCharge: pkgCharge,
        discount: Number(discount || 0),
        grandTotal,
        payments,
        items: validatedItems,
        notes: fullNotes,
      },
    });
  } catch (error) {
    console.error("Error creating takeaway bill:", error);
    res.status(500).json({ message: "Failed to create takeaway order" });
  }
};

/**
 * Standard hospitality shift cutoff (5:00 AM).
 * If current time is e.g. 02:30 AM, the shift belongs to yesterday 05:00 AM.
 */
const getShiftStartCutoff = (): Date => {
  const now = new Date();
  const cutoff = new Date(now);
  if (now.getHours() < 5) {
    cutoff.setDate(cutoff.getDate() - 1);
  }
  cutoff.setHours(5, 0, 0, 0);
  return cutoff;
};

/**
 * GET /api/cashier/history
 * Today's closed bills and shift transactions
 */
export const getSettledBillsHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAllTime = req.query.range === "all";
    const shiftCutoff = getShiftStartCutoff();

    const sessions = await prisma.diningSession.findMany({
      where: isAllTime
        ? { status: "COMPLETED" }
        : { status: "COMPLETED", endTime: { gte: shiftCutoff } },
      orderBy: { endTime: "desc" },
      include: {
        table: true,
        orders: {
          include: {
            orderItems: {
              include: { menuItem: true },
            },
          },
        },
        payments: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const history = sessions.map((s) => {
      const tableNumber = s.table?.tableNumber === 999 ? "Takeaway" : s.table?.tableNumber || "Takeaway";
      const totalAmount = Number(s.totalAmount);
      const itemsCount = s.orders.reduce(
        (sum, o) => sum + o.orderItems.reduce((oiSum, oi) => oiSum + oi.quantity, 0),
        0
      );

      const review = s.reviews && s.reviews.length > 0 ? {
        id: s.reviews[0].id,
        rating: s.reviews[0].rating,
        feedback: s.reviews[0].feedback,
        tags: s.reviews[0].tags,
        customerName: s.reviews[0].customerName,
        createdAt: s.reviews[0].createdAt,
      } : null;

      return {
        id: s.id,
        invoiceNumber: `INV-${s.sessionCode}`,
        sessionCode: s.sessionCode,
        tableNumber,
        startTime: s.startTime,
        endTime: s.endTime,
        totalAmount,
        itemsCount,
        payments: s.payments.map((p) => ({
          method: p.paymentMethod,
          amount: Number(p.amount),
        })),
        items: s.orders.flatMap((o) =>
          o.orderItems.map((oi) => ({
            name: oi.menuItem.name,
            quantity: oi.quantity,
            price: Number(oi.price),
            subtotal: Number(oi.subtotal),
          }))
        ),
        review,
      };
    });

    res.json(history);
  } catch (error) {
    console.error("Error fetching settled bills history:", error);
    res.status(500).json({ message: "Failed to load settlement history" });
  }
};

/**
 * GET /api/cashier/stats
 * Cashier shift metrics (Revenue, Cash vs UPI vs Card breakdown, Settled bills count)
 */
export const getCashierStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAllTime = req.query.range === "all";
    const shiftCutoff = getShiftStartCutoff();

    const payments = await prisma.payment.findMany({
      where: isAllTime
        ? { paymentStatus: "PAID" }
        : { paymentStatus: "PAID", paidAt: { gte: shiftCutoff } },
    });

    let totalRevenue = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount);
      totalRevenue += amt;
      if (p.paymentMethod === "CASH") cashTotal += amt;
      else if (p.paymentMethod === "UPI") upiTotal += amt;
      else if (p.paymentMethod === "CARD") cardTotal += amt;
    });

    const activeTablesCount = await prisma.restaurantTable.count({
      where: { status: { in: ["OCCUPIED", "BILLING"] } },
    });

    const billingTablesCount = await prisma.restaurantTable.count({
      where: { status: "BILLING" },
    });

    const settledSessionsCount = await prisma.diningSession.count({
      where: isAllTime
        ? { status: "COMPLETED" }
        : { status: "COMPLETED", endTime: { gte: shiftCutoff } },
    });

    res.json({
      totalRevenue: Number(totalRevenue.toFixed(2)),
      cashTotal: Number(cashTotal.toFixed(2)),
      upiTotal: Number(upiTotal.toFixed(2)),
      cardTotal: Number(cardTotal.toFixed(2)),
      settledBillsCount: settledSessionsCount,
      activeTablesCount,
      billingTablesCount,
      pendingAccessCount: pendingAccessRequests.size,
    });
  } catch (error) {
    console.error("Error fetching cashier stats:", error);
    res.status(500).json({ message: "Failed to calculate cashier metrics" });
  }
};


/**
 * POST /api/cashier/table/transfer
 * Transfer active dining session from one table to another available table
 */
export const transferTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromTableNumber, toTableNumber } = req.body;

    if (!fromTableNumber || !toTableNumber) {
      res.status(400).json({ message: "Source and destination table numbers are required" });
      return;
    }

    if (Number(fromTableNumber) === Number(toTableNumber)) {
      res.status(400).json({ message: "Source and destination table must be different" });
      return;
    }

    const sourceTable = await prisma.restaurantTable.findUnique({
      where: { tableNumber: Number(fromTableNumber) },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!sourceTable || sourceTable.sessions.length === 0) {
      res.status(404).json({ message: `Table #${fromTableNumber} does not have an active dining session` });
      return;
    }

    const activeSession = sourceTable.sessions[0];

    const destTable = await prisma.restaurantTable.findUnique({
      where: { tableNumber: Number(toTableNumber) },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!destTable) {
      res.status(404).json({ message: `Destination Table #${toTableNumber} not found` });
      return;
    }

    if (destTable.sessions.length > 0 || destTable.status === "OCCUPIED" || destTable.status === "BILLING") {
      res.status(400).json({ message: `Destination Table #${toTableNumber} is already occupied` });
      return;
    }

    // Execute atomic transfer
    const { updatedSource, updatedDest, updatedSession } = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.diningSession.update({
        where: { id: activeSession.id },
        data: { tableId: destTable.id },
      });

      const updatedSource = await tx.restaurantTable.update({
        where: { id: sourceTable.id },
        data: { status: "AVAILABLE" },
      });

      const updatedDest = await tx.restaurantTable.update({
        where: { id: destTable.id },
        data: { status: "OCCUPIED" },
      });

      return { updatedSource, updatedDest, updatedSession };
    });

    // Notify rooms & staff
    emitTableUpdate(updatedSource);
    emitTableUpdate(updatedDest);

    emitToTable(Number(fromTableNumber), "table:transferred", {
      fromTable: fromTableNumber,
      toTable: toTableNumber,
      message: `Your table has been transferred to Table #${toTableNumber}`,
    });

    emitToStaff("cashier:table_transferred", {
      fromTable: fromTableNumber,
      toTable: toTableNumber,
      sessionId: activeSession.id,
    });

    res.json({
      success: true,
      message: `Table #${fromTableNumber} successfully transferred to Table #${toTableNumber}`,
      session: updatedSession,
      sourceTable: updatedSource,
      destTable: updatedDest,
    });
  } catch (error) {
    console.error("Error transferring table:", error);
    res.status(500).json({ message: "Failed to transfer table" });
  }
};

/**
 * POST /api/cashier/table/:tableNumber/add-items
 * Directly punch items into an active table's dining session from cashier terminal
 */
export const addItemsToTableSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const tableNumber = Number(req.params.tableNumber);
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "Please specify items to add" });
      return;
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { tableNumber },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!table) {
      res.status(404).json({ message: `Table #${tableNumber} not found` });
      return;
    }

    // If no active session, create one
    let session = table.sessions[0];
    if (!session) {
      const sessionCode = `SESS-T${tableNumber}-${Date.now().toString().slice(-6)}`;
      session = await prisma.diningSession.create({
        data: {
          tableId: table.id,
          sessionCode,
          status: "ACTIVE",
          totalAmount: 0,
        },
      });

      await prisma.restaurantTable.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });
    }

    // Validate menu items & stock
    const menuItemIds = items.map((i: any) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { inventory: true },
    });

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));
    let orderSubtotal = 0;
    const validatedItems: Array<{
      menuItemId: number;
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const it of items) {
      const dish = itemMap.get(it.menuItemId);
      if (!dish) {
        res.status(400).json({ message: `Item ID ${it.menuItemId} not found.` });
        return;
      }
      if (!dish.isAvailable || (dish.inventory && dish.inventory.remainingQty < it.quantity)) {
        res.status(400).json({ message: `"${dish.name}" does not have sufficient stock.` });
        return;
      }

      const price = Number(dish.price);
      const subtotal = price * it.quantity;
      orderSubtotal += subtotal;

      validatedItems.push({
        menuItemId: dish.id,
        name: dish.name,
        price,
        quantity: it.quantity,
        subtotal,
      });
    }

    const orderNumber = `ORD-T${tableNumber}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          diningSessionId: session.id,
          orderNumber,
          status: "PREPARING",
          notes: notes ? `[Cashier POS] ${notes}` : "[Cashier POS]",
          orderedAt: new Date(),
        },
      });

      for (const vi of validatedItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: vi.menuItemId,
            quantity: vi.quantity,
            price: vi.price,
            subtotal: vi.subtotal,
          },
        });

        // Deduct inventory
        const dish = itemMap.get(vi.menuItemId);
        if (dish?.inventory) {
          const newQty = Math.max(0, dish.inventory.remainingQty - vi.quantity);
          await tx.inventory.update({
            where: { menuItemId: vi.menuItemId },
            data: {
              remainingQty: newQty,
              isAvailable: newQty > 0,
            },
          });
        }
      }

      return order;
    });

    // Notify kitchen
    emitToStaff("order:placed", {
      orderId: result.id,
      orderNumber: result.orderNumber,
      tableNumber,
      status: "PREPARING",
      notes: result.notes,
      items: validatedItems,
    });

    // Notify table room & floor
    emitToTable(tableNumber, "order:placed", {
      order: {
        id: result.id,
        orderNumber: result.orderNumber,
        status: "PREPARING",
        orderItems: validatedItems,
      },
    });

    const updatedTable = await prisma.restaurantTable.findUnique({
      where: { id: table.id },
    });
    if (updatedTable) {
      emitTableUpdate(updatedTable);
    }

    res.status(201).json({
      success: true,
      message: `Items added to Table #${tableNumber} and sent to kitchen!`,
      order: result,
      items: validatedItems,
    });
  } catch (error) {
    console.error("Error adding items to table:", error);
    res.status(500).json({ message: "Failed to add items to table" });
  }
};

/**
 * GET /api/cashier/takeaway/orders
 * Returns today's active & completed takeaway orders for queue management
 */
export const getTakeawayOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { diningSession: { table: { tableNumber: 999 } } },
          { diningSession: { sessionCode: { startsWith: "TAKEAWAY-" } } },
        ],
        createdAt: { gte: startOfDay },
      },
      include: {
        diningSession: {
          include: {
            payments: true,
          },
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedOrders = orders.map((ord) => {
      let customerName = "Walk-in Guest";
      let customerPhone = "";
      let orderNotes = ord.notes || "";

      const match = ord.notes?.match(/\[Takeaway:\s*([^\]|]+)(?:\|\s*Ph:\s*([^\]]+))?\]/);
      if (match) {
        customerName = match[1]?.trim() || "Walk-in Guest";
        customerPhone = match[2]?.trim() || "";
        orderNotes = ord.notes ? ord.notes.replace(/\[Takeaway:[^\]]+\]\s*/, "").trim() : "";
      }

      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        status: ord.status, // PENDING | PREPARING | READY | SERVED | CANCELLED
        createdAt: ord.createdAt,
        orderedAt: ord.orderedAt,
        notes: orderNotes,
        rawNotes: ord.notes,
        customerName,
        customerPhone,
        totalAmount: Number(ord.diningSession.totalAmount),
        sessionCode: ord.diningSession.sessionCode,
        payments: ord.diningSession.payments.map((p) => ({
          id: p.id,
          method: p.paymentMethod,
          amount: Number(p.amount),
          status: p.paymentStatus,
          paidAt: p.paidAt,
        })),
        items: ord.orderItems.map((oi) => ({
          id: oi.id,
          menuItemId: oi.menuItemId,
          name: oi.menuItem.name,
          quantity: oi.quantity,
          price: Number(oi.price),
          subtotal: Number(oi.subtotal),
          imageUrl: oi.menuItem.imageUrl,
          categoryName: oi.menuItem.category?.name,
        })),
      };
    });

    res.json({
      success: true,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching takeaway orders:", error);
    res.status(500).json({ message: "Failed to fetch takeaway orders" });
  }
};

/**
 * PATCH /api/cashier/takeaway/order/:orderId/status
 * Updates status of a takeaway order (e.g. PREPARING -> READY -> SERVED / CANCELLED)
 */
export const updateTakeawayOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = Number(req.params.orderId);
    const { status } = req.body;

    if (!orderId || isNaN(orderId)) {
      res.status(400).json({ message: "Valid Order ID required." });
      return;
    }

    const validStatuses = ["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        diningSession: {
          include: {
            table: true,
            payments: true,
          },
        },
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Notify kitchen and staff channels
    emitToStaff("order:status_update", {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      tableNumber: "Takeaway",
      order: updated,
    });

    if (updated.status === "SERVED") {
      emitToStaff("order:served", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        tableNumber: "Takeaway",
      });
    }

    emitToTable("Takeaway", "order:status_update", {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
    });

    res.json({
      success: true,
      message: `Takeaway order #${updated.orderNumber} status changed to ${updated.status}`,
      order: updated,
    });
  } catch (error) {
    console.error("Error updating takeaway order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

/**
 * PATCH /api/cashier/takeaway/order/:orderId
 * Updates customer details and notes on an active takeaway order
 */
export const updateTakeawayOrderDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = Number(req.params.orderId);
    const { customerName, customerPhone, notes } = req.body;

    if (!orderId || isNaN(orderId)) {
      res.status(400).json({ message: "Valid Order ID required." });
      return;
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { diningSession: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Takeaway order not found." });
      return;
    }

    // Format notes string with customer name and phone
    const phonePart = customerPhone ? ` | Ph: ${customerPhone}` : "";
    const headerPart = `[Takeaway: ${customerName || "Customer"}${phonePart}]`;
    const fullNotes = notes ? `${headerPart} ${notes}` : headerPart;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { notes: fullNotes },
      include: {
        diningSession: {
          include: {
            table: true,
            payments: true,
          },
        },
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Broadcast updated order details to Kitchen Display System & Staff channels
    emitToStaff("order:status_update", {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      tableNumber: "Takeaway",
      order: updated,
    });

    res.json({
      success: true,
      message: `Takeaway token #${updated.orderNumber} updated successfully`,
      order: updated,
    });
  } catch (error) {
    console.error("Error updating takeaway order details:", error);
    res.status(500).json({ message: "Failed to update order details" });
  }
};


