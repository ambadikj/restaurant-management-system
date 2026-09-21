import { Request, Response } from 'express';
import prisma from '../prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * ============================================================================
 * AUTHENTICATION CONTROLLER (auth.controller.ts)
 * ============================================================================
 * PURPOSE:
 * Handles user login authentication for staff members (Admin, Cashier, Kitchen).
 * Uses bcrypt to verify hashed passwords stored in PostgreSQL, and generates
 * signed JWT tokens with 12-hour expiration upon successful authentication.
 * ============================================================================
 */

/**
 * POST /api/auth/login
 * Public endpoint: Authenticates staff credentials
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Step 1: Query the user in PostgreSQL by unique username, including their Role
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true }
    });

    // Step 2: Validate user existence and check if account is active (not suspended)
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid credentials or account disabled' });
      return;
    }

    // Step 3: Securely compare the plain-text password with the bcrypt hash stored in DB
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Step 4: Generate a signed JSON Web Token (JWT) with user ID and Role payload
    const token = jwt.sign(
      { id: user.id, role: user.role.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '12h' } // Token is valid for 12 hours
    );

    // Step 5: Return token and public user metadata (password hash is strictly omitted)
    res.status(200).json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/auth/me
 * Protected endpoint: Returns details of the currently authenticated user
 */
export const getCurrentUser = async (req: any, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, fullName: true, username: true, role: { select: { name: true } } }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};