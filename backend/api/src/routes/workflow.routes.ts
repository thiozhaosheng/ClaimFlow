import { Router } from 'express';
import * as workflowController from '../controllers/workflow.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.patch('/review/:id', protect, restrictTo(Role.Manager, Role.FinanceAdmin), workflowController.reviewClaim);

export default router;