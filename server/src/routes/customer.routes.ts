import { Router } from "express";
import {
  getPublicMenu,
  getTableInfo,
  placeOrder,
  getSessionOrders,
  requestService,
  submitReview,
  getReviews,
} from "../controllers/customer.controller";

const router = Router();

// Public customer routes (No JWT required)
router.get("/menu", getPublicMenu);
router.get("/table/:tableNumber", getTableInfo);
router.post("/order", placeOrder);
router.get("/session/:tableNumber", getSessionOrders);
router.post("/service", requestService);
router.post("/review", submitReview);
router.get("/reviews", getReviews);

export default router;

