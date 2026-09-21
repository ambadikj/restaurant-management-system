import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

/**
 * ============================================================================
 * REAL-TIME WEBSOCKET SERVICE (socket.ts)
 * ============================================================================
 * PURPOSE:
 * Manages full-duplex, low-latency WebSocket communication using Socket.IO.
 * 
 * HOW ROOMS WORK:
 * 1. "table:X" room: Diners and table tablets join this room to get real-time
 *    updates for their specific table (e.g. order accepted, cooking, bill ready).
 * 2. "staff:all" room: Kitchen KDS and Cashier POS dashboards join this room to
 *    receive instant alerts for incoming orders, status changes, and stock updates.
 * ============================================================================
 */

let io: SocketIOServer | null = null;

/**
 * Initializes the Socket.IO server on top of the Node.js HTTP server
 */
export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);

    // Customer or staff joins table room (e.g., table:1, table:2)
    socket.on("join:table", (tableNumber: number | string) => {
      const room = `table:${tableNumber}`;
      socket.join(room);
      console.log(`📌 Socket ${socket.id} joined room ${room}`);
      socket.emit("joined:table", { room, tableNumber });
    });

    // Kitchen, Cashier, or Admin joins staff channel
    socket.on("join:staff", (role: string) => {
      const room = `staff:${role || "all"}`;
      socket.join(room);
      socket.join("staff:all");
      console.log(`👨‍🍳 Socket ${socket.id} joined staff channel ${room}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

/**
 * Retrieves the active Socket.IO server instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized. Call initSocket first.");
  }
  return io;
};

// ============================================================================
// HELPER EMIT FUNCTIONS (Called by Controllers to broadcast changes)
// ============================================================================

/** Emit an event strictly to customers at a specific table */
export const emitToTable = (tableNumber: number | string, event: string, data: any) => {
  if (io) {
    io.to(`table:${tableNumber}`).emit(event, data);
  }
};

/** Emit an event to all staff members (Kitchen KDS + Cashier POS) */
export const emitToStaff = (event: string, data: any) => {
  if (io) {
    io.to("staff:all").emit(event, data);
    io.emit(event, data); // Also broadcast globally for POS dashboard
  }
};

/** Emit an inventory change (e.g. dish marked sold out via Auto-86) to all connected clients */
export const emitStockUpdate = (menuItemId: number, remainingQty: number, isAvailable: boolean) => {
  if (io) {
    io.emit("inventory:stock_update", { menuItemId, remainingQty, isAvailable });
  }
};

/** Emit a table status transition (e.g. AVAILABLE -> OCCUPIED -> BILLING) */
export const emitTableUpdate = (table: any) => {
  if (io) {
    io.emit("table:update", table);
    io.to("staff:all").emit("table:update", table);
  }
};

/** Emit table deletion event */
export const emitTableDelete = (tableId: number) => {
  if (io) {
    io.emit("table:deleted", { id: tableId });
    io.to("staff:all").emit("table:deleted", { id: tableId });
  }
};

/** Emit menu changes (e.g., dish price updated or category added) */
export const emitMenuUpdate = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
    io.to("staff:all").emit(event, data);
  }
};

/** Emit employee status changes (e.g., staff suspended or role updated) */
export const emitEmployeeUpdate = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
    io.to("staff:all").emit(event, data);
  }
};
