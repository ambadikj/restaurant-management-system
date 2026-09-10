import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';

// Get all roles (Needed for the frontend dropdown when adding a user)
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await prisma.role.findMany();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching roles' });
  }
};

// Get all users (excluding passwords)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        isActive: true,
        role: {
          select: { name: true }
        }
      },
      orderBy: { id: 'asc' }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Create a new employee
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, username, email, password, roleId } = req.body;

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });

    if (existingUser) {
      res.status(400).json({ message: 'Username or Email already in use' });
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        fullName,
        username,
        email,
        password: hashedPassword,
        roleId: Number(roleId),
        isActive: true,
      },
      select: { id: true, username: true, role: { select: { name: true } } }
    });

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Toggle user active status (Disable/Enable employee)
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    
    // Prevent admin from disabling themselves
    if (userId === (req as any).user.id) {
      res.status(400).json({ message: 'You cannot disable your own account' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, username: true, isActive: true }
    });

    res.status(200).json({ message: 'User status updated', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status' });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    const { fullName, email, roleId, password } = req.body;

    const dataToUpdate: any = {};
    if (fullName) dataToUpdate.fullName = fullName;
    if (email) dataToUpdate.email = email;
    if (roleId) dataToUpdate.roleId = Number(roleId);
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        isActive: true,
        role: { select: { name: true } },
      },
    });

    res.json({ message: 'User updated successfully', user: updated });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);

    if (userId === (req as any).user.id) {
      res.status(400).json({ message: 'You cannot delete your own account' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};