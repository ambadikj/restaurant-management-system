import { Request, Response } from 'express';
import prisma from '../prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // 1. Find user and include their role
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Invalid credentials or account disabled' });
      return;
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '12h' } // Token lasts 12 hours
    );

    // 4. Return token and user data (excluding password)
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

// We will use this with our middleware to get the currently logged-in user
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