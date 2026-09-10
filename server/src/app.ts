import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import menuRoutes from "./routes/menu.routes";
import tableRoutes from "./routes/table.routes"; // <-- ADDED THIS

const app = express();

app.use(cors());
app.use(express.json());

// process.cwd() safely points to your 'server' folder, avoiding all __dirname conflicts
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/tables", tableRoutes); // <-- ADDED THIS

app.get("/", (req, res) => {
  res.json({
    status: "Restaurant Management API is running",
    healthCheck: "/api/health",
    clientUrl: "http://localhost:5173",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

export default app;
