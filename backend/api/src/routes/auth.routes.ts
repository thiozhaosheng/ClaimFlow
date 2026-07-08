import { Router } from 'express';
import { login, me, forgotPassword } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { forgotPasswordSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
router.get('/me', protect, me);

export default router;
