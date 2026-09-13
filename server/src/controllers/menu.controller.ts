import { Request, Response } from "express";
import prisma from "../prisma/client";
import { emitStockUpdate, emitMenuUpdate } from "../socket";

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
    emitMenuUpdate("category:created", category);
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

    emitMenuUpdate("menu:item_created", newItem);

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
    const { remainingQty, dailyLimit } = req.body;
    const itemId = Number(req.params.id);
    const newQty = Math.max(0, Number(remainingQty));
    const isNowAvailable = newQty > 0;

    const inventory = await prisma.inventory.upsert({
      where: { menuItemId: itemId },
      update: {
        remainingQty: newQty,
        ...(dailyLimit !== undefined && { dailyLimit: Number(dailyLimit) }),
        isAvailable: isNowAvailable,
      },
      create: {
        menuItemId: itemId,
        dailyLimit: Number(dailyLimit || (newQty > 0 ? newQty : 50)),
        remainingQty: newQty,
        isAvailable: isNowAvailable,
      },
    });

    const updatedItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: isNowAvailable },
      include: { category: true, inventory: true },
    });

    emitStockUpdate(itemId, newQty, isNowAvailable);
    emitMenuUpdate("menu:item_updated", updatedItem);

    res.json(inventory);
  } catch (error) {
    console.error("Error updating inventory:", error);
    res.status(500).json({ message: "Error updating inventory" });
  }
};

export const toggleItemStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const itemId = Number(req.params.id);
    const item = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { inventory: true },
    });

    if (!item) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    const nextAvailable = !item.isAvailable;
    let newQty = item.inventory?.remainingQty ?? 50;

    // If restocking an item that has 0 portions, restore to dailyLimit (or 20)
    if (nextAvailable && newQty <= 0) {
      newQty = item.inventory?.dailyLimit && item.inventory.dailyLimit > 0
        ? item.inventory.dailyLimit
        : 20;
    } else if (!nextAvailable) {
      newQty = 0;
    }

    await prisma.inventory.upsert({
      where: { menuItemId: itemId },
      update: {
        remainingQty: newQty,
        isAvailable: nextAvailable,
      },
      create: {
        menuItemId: itemId,
        dailyLimit: newQty > 0 ? newQty : 50,
        remainingQty: newQty,
        isAvailable: nextAvailable,
      },
    });

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: nextAvailable },
      include: { category: true, inventory: true },
    });

    emitStockUpdate(updated.id, newQty, nextAvailable);
    emitMenuUpdate("menu:item_updated", updated);

    res.json(updated);
  } catch (error) {
    console.error("Error toggling status:", error);
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

    const newRemaining = remainingQty !== undefined ? Math.max(0, Number(remainingQty)) : undefined;
    const isNowAvailable = isAvailable !== undefined
      ? (isAvailable === 'true' || isAvailable === true)
      : (newRemaining !== undefined ? newRemaining > 0 : undefined);

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (price !== undefined) dataToUpdate.price = Number(price);
    if (categoryId !== undefined) dataToUpdate.categoryId = Number(categoryId);
    if (imageUrl) dataToUpdate.imageUrl = imageUrl;
    if (isNowAvailable !== undefined) dataToUpdate.isAvailable = isNowAvailable;

    await prisma.menuItem.update({
      where: { id: itemId },
      data: dataToUpdate,
    });

    if (dailyLimit !== undefined || newRemaining !== undefined) {
      await prisma.inventory.upsert({
        where: { menuItemId: itemId },
        update: {
          ...(dailyLimit !== undefined && { dailyLimit: Number(dailyLimit) }),
          ...(newRemaining !== undefined && {
            remainingQty: newRemaining,
            isAvailable: newRemaining > 0,
          }),
        },
        create: {
          menuItemId: itemId,
          dailyLimit: Number(dailyLimit || 50),
          remainingQty: Number(newRemaining !== undefined ? newRemaining : (dailyLimit || 50)),
          isAvailable: newRemaining !== undefined ? newRemaining > 0 : true,
        },
      });
    }

    const finalItem = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: true, inventory: true },
    });

    if (finalItem) {
      emitStockUpdate(finalItem.id, finalItem.inventory?.remainingQty ?? 0, finalItem.isAvailable);
      emitMenuUpdate("menu:item_updated", finalItem);
    }

    res.json(finalItem);
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({ message: "Error updating menu item" });
  }
};

export const resetDailyInventory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const allItems = await prisma.menuItem.findMany({
      include: { inventory: true },
    });

    for (const item of allItems) {
      const limit = item.inventory?.dailyLimit && item.inventory.dailyLimit > 0
        ? item.inventory.dailyLimit
        : 50;

      await prisma.inventory.upsert({
        where: { menuItemId: item.id },
        update: {
          remainingQty: limit,
          isAvailable: true,
        },
        create: {
          menuItemId: item.id,
          dailyLimit: limit,
          remainingQty: limit,
          isAvailable: true,
        },
      });

      await prisma.menuItem.update({
        where: { id: item.id },
        data: { isAvailable: true },
      });

      emitStockUpdate(item.id, limit, true);
    }

    const refreshedItems = await prisma.menuItem.findMany({
      include: { category: true, inventory: true },
      orderBy: { id: "asc" },
    });

    emitMenuUpdate("menu:bulk_reset", refreshedItems);

    res.json({ message: "All inventory stock reset to daily limits", items: refreshedItems });
  } catch (error) {
    console.error("Error resetting daily inventory:", error);
    res.status(500).json({ message: "Error resetting daily inventory" });
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

    emitMenuUpdate("menu:item_deleted", { id: itemId });

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

    emitMenuUpdate("category:deleted", { id: catId });

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Error deleting category" });
  }
};
