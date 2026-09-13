import dotenv from "dotenv";
import { createServer } from "http";
import app from "./app.js";
import { initSocket } from "./socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

// Attach Socket.IO to the HTTP server
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`⚡ Socket.IO initialized and ready`);
});

