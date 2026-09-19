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
  getTakeawayOrders,
  updateTakeawayOrderStatus,
  getSettledBillsHistory,
  getCashierStats,
  transferTable,
  addItemsToTableSession,
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
router.post("/table/transfer", transferTable);
router.post("/table/:tableNumber/add-items", addItemsToTableSession);

// Billing & POS
router.get("/session/:sessionId/bill", getSessionBillDetails);
router.post("/settle", settleBill);

// Takeaway POS & Orders Queue
router.post("/takeaway", createTakeawayBill);
router.get("/takeaway/orders", getTakeawayOrders);
router.patch("/takeaway/order/:orderId/status", updateTakeawayOrderStatus);

// History & Metrics
router.get("/history", getSettledBillsHistory);
router.get("/stats", getCashierStats);

export default router;
