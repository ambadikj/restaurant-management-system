import { Router } from "express";
import {
  getPublicMenu,
  getTableInfo,
  placeOrder,
  getSessionOrders,
  requestService,
} from "../controllers/customer.controller";

const router = Router();

// Public customer routes (No JWT required)
router.get("/menu", getPublicMenu);
router.get("/table/:tableNumber", getTableInfo);
router.post("/order", placeOrder);
router.get("/session/:tableNumber", getSessionOrders);
router.post("/service", requestService);

export default router;
