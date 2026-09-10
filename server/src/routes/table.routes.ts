import { Router } from 'express';
import { getTables, createTable, deleteTable, generateQR, updateTableStatus } from '../controllers/table.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Protect all table configuration routes for Admins only
router.use(authenticateJWT, authorizeRoles('Admin'));

router.get('/', getTables);
router.post('/', createTable);
router.patch('/:id/status', updateTableStatus);
router.delete('/:id', deleteTable);
router.get('/:tableNumber/qr', generateQR);

export default router;