import express from "express";
import cors from "cors";
import path from "path";

// Import route modules for each domain
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import menuRoutes from "./routes/menu.routes";
import tableRoutes from "./routes/table.routes";
import customerRoutes from "./routes/customer.routes";
import kitchenRoutes from "./routes/kitchen.routes";
import cashierRoutes from "./routes/cashier.routes";
import waiterRoutes from "./routes/waiter.routes";

/**
 * ============================================================================
 * EXPRESS APPLICATION CONFIGURATION (app.ts)
 * ============================================================================
 * PURPOSE:
 * Initializes the Express server application, mounts global middlewares
 * (CORS, JSON body parser, Static files), and binds all REST API routes.
 * ============================================================================
 */
const app = express();

// 1. Cross-Origin Resource Sharing (CORS):
// Allows frontend apps (e.g. running on http://localhost:5173) to communicate with this API
app.use(cors());

// 2. JSON Body Parser:
// Parses incoming HTTP requests with application/json payloads into req.body
app.use(express.json());

// 3. Static File Serving:
// Exposes the "uploads" folder publicly at the URL path "/uploads"
// This allows dish photos uploaded via Multer to be viewed by customer and admin browsers
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/**
 * ============================================================================
 * REST API ROUTE MOUNTING
 * ============================================================================
 */
app.use("/api/auth", authRoutes);       // Staff authentication & login
app.use("/api/users", userRoutes);       // Staff accounts & RBAC management
app.use("/api/menu", menuRoutes);        // Menu dishes, categories & Auto-86 inventory
app.use("/api/tables", tableRoutes);     // Restaurant floor tables & QR standee generator
app.use("/api/customer", customerRoutes); // Public contactless ordering, cart & reviews
app.use("/api/kitchen", kitchenRoutes);   // Kitchen Display System (KDS) order processing
app.use("/api/cashier", cashierRoutes);   // Cashier POS, table billing & payment settlement
app.use("/api/waiter", waiterRoutes);     // Floor waitstaff dispatcher & table assistance

// Root Status Endpoint
app.get("/", (req, res) => {
  res.json({
    status: "Restaurant Management API is running",
    healthCheck: "/api/health",
    clientUrl: "http://localhost:5173",
  });
});

// Health Check Endpoint (used by uptime monitors or container orchestrators)
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

export default app;
