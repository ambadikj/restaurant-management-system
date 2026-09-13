import { Request, Response } from "express";
import prisma from "../prisma/client";
import { getIO } from "../socket";

/**
 * GET /api/kitchen/orders
 * Fetch all active orders (PENDING, PREPARING, READY) for the KDS Kanban board.
 * Includes order items with menu item details, and the dining session + table info.
 */
export const getActiveOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["PENDING", "PREPARING", "READY"] },
      },
      include: {
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
        diningSession: {
          include: {
            table: {
              select: {
                tableNumber: true,
                capacity: true,
              },
            },
          },
        },
      },
      orderBy: { orderedAt: "asc" },
    });

    res.json(orders);
  } catch (error) {
    console.error("Error fetching active kitchen orders:", error);
    res.status(500).json({ message: "Failed to load kitchen orders." });
  }
};

/**
 * PATCH /api/kitchen/orders/:id/status
 * Update an order's status through the kitchen pipeline:
 *   PENDING → PREPARING → READY → SERVED
 *
 * Emits real-time Socket.IO events to:
 *   1. The customer's table room (order:status_update)
 *   2. All staff channels (order:status_update)
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    if (!orderId || isNaN(orderId)) {
      res.status(400).json({ message: "Invalid order ID." });
      return;
    }

    const validStatuses = ["PENDING", "PREPARING", "READY", "SERVED"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    // Fetch the existing order to validate transition and get table info
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        diningSession: {
          include: {
            table: { select: { tableNumber: true } },
          },
        },
      },
    });

    if (!existingOrder) {
      res.status(404).json({ message: `Order #${orderId} not found.` });
      return;
    }

    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
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
        diningSession: {
          include: {
            table: { select: { tableNumber: true, capacity: true } },
          },
        },
      },
    });

    // Emit real-time Socket.IO updates
    const io = getIO();
    const tableNumber = existingOrder.diningSession.table.tableNumber;
    const displayTable = tableNumber === 999 ? "Takeaway" : tableNumber;

    // 1. Notify the customer's table room
    io.to(`table:${displayTable}`).emit("order:status_update", {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
    });

    // 2. Broadcast to all staff (other KDS screens, POS, admin)
    io.to("staff:all").emit("order:status_update", {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      tableNumber: displayTable,
      order: updatedOrder,
    });

    // Also broadcast globally for any listeners not in staff:all
    io.emit("order:kitchen_update", {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      tableNumber: displayTable,
    });

    res.json({
      message: `Order ${updatedOrder.orderNumber} updated to ${status}.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status." });
  }
};

/**
 * GET /api/kitchen/orders/history
 * Fetch recently completed orders (READY or SERVED) from the last 2 hours
 * for the kitchen's historical reference view.
 */
export const getOrderHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["SERVED"] },
        updatedAt: { gte: twoHoursAgo },
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                category: { select: { name: true } },
              },
            },
          },
        },
        diningSession: {
          include: {
            table: { select: { tableNumber: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    res.json(orders);
  } catch (error) {
    console.error("Error fetching kitchen order history:", error);
    res.status(500).json({ message: "Failed to load order history." });
  }
};
