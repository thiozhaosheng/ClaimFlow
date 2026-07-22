import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile', protect, userController.getProfile);
router.get('/me/export', protect, userController.exportUserData);
router.get('/', userController.getAllUsers);
router.post('/verify', userController.verifyUser);
router.post('/register', userController.registerUser);
router.patch('/update-password', userController.updatePassword);

export default router;