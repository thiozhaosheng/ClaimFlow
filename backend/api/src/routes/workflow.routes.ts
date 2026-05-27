import { Router } from 'express';
import * as workflowController from '../controllers/workflow.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

router.patch(
  '/review/:id',
  restrictTo(Role.Manager, Role.FinanceAdmin),
  workflowController.reviewClaim,
);

router.patch(
  '/pay/:id',
  restrictTo(Role.FinanceAdmin),
  workflowController.markAsPaid,
);

router.get(
  '/audit',
  restrictTo(Role.FinanceAdmin),
  workflowController.getAuditTrail,
);

export default router;
