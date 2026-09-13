import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
      ],
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

    // Kitchen or Admin joins staff channel
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

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized. Call initSocket first.");
  }
  return io;
};

// Helper emit functions
export const emitToTable = (tableNumber: number | string, event: string, data: any) => {
  if (io) {
    io.to(`table:${tableNumber}`).emit(event, data);
  }
};

export const emitToStaff = (event: string, data: any) => {
  if (io) {
    io.to("staff:all").emit(event, data);
    io.emit(event, data); // also broadcast globally for POS dashboard
  }
};

export const emitStockUpdate = (menuItemId: number, remainingQty: number, isAvailable: boolean) => {
  if (io) {
    io.emit("inventory:stock_update", { menuItemId, remainingQty, isAvailable });
  }
};

export const emitTableUpdate = (table: any) => {
  if (io) {
    io.emit("table:update", table);
    io.to("staff:all").emit("table:update", table);
  }
};

export const emitTableDelete = (tableId: number) => {
  if (io) {
    io.emit("table:deleted", { id: tableId });
    io.to("staff:all").emit("table:deleted", { id: tableId });
  }
};

export const emitMenuUpdate = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
    io.to("staff:all").emit(event, data);
  }
};

export const emitEmployeeUpdate = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
    io.to("staff:all").emit(event, data);
  }
};
