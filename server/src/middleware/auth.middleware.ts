import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to include our user payload
export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
      if (err) {
        res.status(403).json({ message: "Invalid or expired token" });
        return;
      }

      // Attach the decoded token payload to the request object
      req.user = decoded as { id: number; role: string };
      next();
    });
  } else {
    res.status(401).json({ message: "Authorization header missing" });
  }
};

// Role-based authorization middleware
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res
        .status(403)
        .json({ message: "Access denied: Insufficient permissions" });
      return;
    }
    next();
  };
};
