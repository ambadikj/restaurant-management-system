import { Router } from "express";
import {
  getActiveOrders,
  updateOrderStatus,
  getOrderHistory,
} from "../controllers/kitchen.controller";

const router = Router();

// Kitchen Display System (KDS) routes
router.get("/orders", getActiveOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.get("/orders/history", getOrderHistory);

export default router;
