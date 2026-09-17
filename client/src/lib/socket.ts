import { io, Socket } from "socket.io-client";

const BACKEND_HOST = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${BACKEND_HOST}:5000`;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("⚡ Connected to Serve_Sync WebSocket server:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Disconnected from Serve_Sync WebSocket server:", reason);
});

export default socket;
