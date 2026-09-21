import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * ============================================================================
 * AUTHENTICATION & RBAC AUTHORIZATION MIDDLEWARE (auth.middleware.ts)
 * ============================================================================
 * PURPOSE:
 * 1. authenticateJWT: Verifies the digital signature and expiration of incoming
 *    JSON Web Tokens (JWT) sent by clients in the "Authorization: Bearer <token>" header.
 * 2. authorizeRoles: Restricts endpoint access strictly to designated user roles
 *    (e.g., only 'Admin' can manage users; only 'Cashier' or 'Admin' can settle bills).
 * ============================================================================
 */

// Extend the standard Express Request interface to carry decoded user identity
export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

/**
 * Middleware: Verifies the JWT Bearer Token.
 * Attaches decoded user data to req.user if valid, or blocks with 401/403 if invalid.
 */
export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  // 1. Extract Authorization header (Expected format: "Bearer <token_string>")
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    // 2. Cryptographically verify the token using the server's secret key
    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
      if (err) {
        // Token was tampered with or expired
        res.status(403).json({ message: "Invalid or expired token" });
        return;
      }

      // 3. Attach decoded user payload (id, role) to the request object
      req.user = decoded as { id: number; role: string };
      next(); // Proceed to the next middleware or controller
    });
  } else {
    // Missing Bearer token in request header
    res.status(401).json({ message: "Authorization header missing" });
  }
};

/**
 * Middleware Factory: Role-Based Access Control (RBAC).
 * Checks whether the authenticated user's role is in the list of allowed roles.
 * Example: authorizeRoles("Cashier", "Admin")
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // If user is missing or their role is not included in the allowed list, reject with 403
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res
        .status(403)
        .json({ message: "Access denied: Insufficient permissions" });
      return;
    }
    // Permitted! Proceed to controller
    next();
  };
};
