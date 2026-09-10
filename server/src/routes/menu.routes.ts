import { Router } from 'express';
import {
  getCategories,
  createCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateInventory,
  toggleItemStatus,
} from '../controllers/menu.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Protect all routes
router.use(authenticateJWT, authorizeRoles('Admin'));

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);

// Menu Items
router.get('/items', getMenuItems);
router.post('/items', upload.single('image'), createMenuItem);
router.put('/items/:id', upload.single('image'), updateMenuItem);
router.patch('/items/:id', upload.single('image'), updateMenuItem);
router.delete('/items/:id', deleteMenuItem);
router.patch('/items/:id/inventory', updateInventory);
router.patch('/items/:id/status', toggleItemStatus);

export default router;