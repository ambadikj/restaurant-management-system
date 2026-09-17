import { Router } from "express";
import {
  getCashierTables,
  updateCashierTableStatus,
  requestTableAccess,
  approveTableAccess,
  declineTableAccess,
  getSessionBillDetails,
  settleBill,
  createTakeawayBill,
  getSettledBillsHistory,
  getCashierStats,
} from "../controllers/cashier.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Public route: Customer scans QR and requests table access
router.post("/table/:tableNumber/request-access", requestTableAccess);

// Protected routes: Requires Cashier or Admin role
router.use(authenticateJWT, authorizeRoles("Cashier", "Admin"));

// Floor & Table management
router.get("/tables", getCashierTables);
router.patch("/table/:tableNumber/status", updateCashierTableStatus);
router.post("/table/:tableNumber/approve-access", approveTableAccess);
router.post("/table/:tableNumber/decline-access", declineTableAccess);

// Billing & POS
router.get("/session/:sessionId/bill", getSessionBillDetails);
router.post("/settle", settleBill);
router.post("/takeaway", createTakeawayBill);

// History & Metrics
router.get("/history", getSettledBillsHistory);
router.get("/stats", getCashierStats);

export default router;
