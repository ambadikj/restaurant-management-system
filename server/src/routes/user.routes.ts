import { Router } from 'express';
import { getRoles, getUsers, createUser, toggleUserStatus } from '../controllers/user.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication and Admin authorization to ALL routes in this file
router.use(authenticateJWT, authorizeRoles('Admin'));

router.get('/roles', getRoles);
router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/status', toggleUserStatus);

export default router;