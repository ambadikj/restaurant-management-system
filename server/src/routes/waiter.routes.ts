import { Router } from "express";
import {
  getWaiterTables,
  getWaiterTableDetail,
  updateWaiterTableStatus,
  placeWaiterOrder,
  updateWaiterOrderStatus,
  requestWaiterBill,
} from "../controllers/waiter.controller";

const router = Router();

// Public waiter routes (no login required, scanned via QR or accessed on floor devices)
router.get("/tables", getWaiterTables);
router.get("/table/:tableNumber", getWaiterTableDetail);
router.patch("/table/:tableNumber/status", updateWaiterTableStatus);
router.post("/order", placeWaiterOrder);
router.patch("/order/:orderId/status", updateWaiterOrderStatus);
router.post("/table/:tableNumber/request-bill", requestWaiterBill);

export default router;
