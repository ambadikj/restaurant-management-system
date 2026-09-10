import { Router } from 'express';
import {
  getRoles,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from '../controllers/user.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication and Admin authorization to ALL routes in this file
router.use(authenticateJWT, authorizeRoles('Admin'));

router.get('/roles', getRoles);
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/status', toggleUserStatus);

export default router;