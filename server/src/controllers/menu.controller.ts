import { Request, Response } from "express";
import prisma from "../prisma/client";

// -- CATEGORIES --
export const getCategories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories" });
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const category = await prisma.category.create({
      data: { name, description },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Error creating category" });
  }
};

// -- MENU & INVENTORY --
export const getMenuItems = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const items = await prisma.menuItem.findMany({
      include: { category: true, inventory: true },
      orderBy: { id: "asc" },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching menu items" });
  }
};

export const createMenuItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, description, price, categoryId, dailyLimit } = req.body;
    const imageUrl = req.file ? `uploads/menu/${req.file.filename}` : undefined;

    const newItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: Number(price),
        categoryId: Number(categoryId),
        ...(imageUrl && { imageUrl }), // Only add if image was uploaded
        inventory: {
          create: {
            dailyLimit: Number(dailyLimit),
            remainingQty: Number(dailyLimit),
          },
        },
      },
      include: { category: true, inventory: true },
    });
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: "Error creating menu item" });
  }
};

export const updateInventory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { remainingQty } = req.body;
    const inventory = await prisma.inventory.update({
      where: { menuItemId: Number(req.params.id) },
      data: { remainingQty: Number(remainingQty) },
    });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Error updating inventory" });
  }
};

export const toggleItemStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const itemId = Number(req.params.id);
    const item = await prisma.menuItem.findUnique({ where: { id: itemId } });

    if (!item) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: !item.isAvailable },
      include: { category: true, inventory: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error toggling status" });
  }
};

export const updateMenuItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const itemId = Number(req.params.id);
    const { name, description, price, categoryId, dailyLimit, remainingQty, isAvailable } = req.body;
    const imageUrl = req.file ? `uploads/menu/${req.file.filename}` : undefined;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (price !== undefined) dataToUpdate.price = Number(price);
    if (categoryId !== undefined) dataToUpdate.categoryId = Number(categoryId);
    if (imageUrl) dataToUpdate.imageUrl = imageUrl;
    if (isAvailable !== undefined) dataToUpdate.isAvailable = isAvailable === 'true' || isAvailable === true;

    const updatedItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: dataToUpdate,
      include: { category: true, inventory: true },
    });

    if (dailyLimit !== undefined || remainingQty !== undefined) {
      await prisma.inventory.upsert({
        where: { menuItemId: itemId },
        update: {
          ...(dailyLimit !== undefined && { dailyLimit: Number(dailyLimit) }),
          ...(remainingQty !== undefined && { remainingQty: Number(remainingQty) }),
        },
        create: {
          menuItemId: itemId,
          dailyLimit: Number(dailyLimit || 50),
          remainingQty: Number(remainingQty !== undefined ? remainingQty : (dailyLimit || 50)),
        },
      });
    }

    const finalItem = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: true, inventory: true },
    });

    res.json(finalItem);
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({ message: "Error updating menu item" });
  }
};

export const deleteMenuItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const itemId = Number(req.params.id);

    // Delete related inventory first
    await prisma.inventory.deleteMany({
      where: { menuItemId: itemId },
    });

    // Delete item
    await prisma.menuItem.delete({
      where: { id: itemId },
    });

    res.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({ message: "Error deleting menu item" });
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const catId = Number(req.params.id);
    await prisma.category.delete({
      where: { id: catId },
    });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Error deleting category" });
  }
};
