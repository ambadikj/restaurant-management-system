import express from "express";
import cors from "cors";
// Use .js here as well
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes"; // Import the new routes

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes); // Add this line

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

export default app;
