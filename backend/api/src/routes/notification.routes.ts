import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/my', ctrl.listMy);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markOneRead);

export default router;
