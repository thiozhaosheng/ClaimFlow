import { Router } from 'express';
import { login, me } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.get('/me', protect, me);

export default router;
