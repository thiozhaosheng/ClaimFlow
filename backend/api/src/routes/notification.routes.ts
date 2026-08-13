import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller';
import { protect, allowQueryToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/my', protect, ctrl.listMy);

// The only route that may carry its token in the URL: EventSource cannot set
// an Authorization header. Everything else on this router, and everywhere
// else in the API, requires the header.
router.get('/live', allowQueryToken, protect, ctrl.liveNotifications);

router.use(protect);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markOneRead);

export default router;
