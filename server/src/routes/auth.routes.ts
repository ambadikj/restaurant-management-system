import { Router } from "express";
// Use .js instead of .ts or leaving it blank
import { login, getCurrentUser } from "../controllers/auth.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";

const router = Router();

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me (Protected route example)
router.get("/me", authenticateJWT, getCurrentUser);

export default router;
