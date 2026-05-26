import { Router } from 'express';
import * as claimController from '../controllers/claim.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

router.post('/', claimController.createClaim);
router.get('/my', claimController.getMyClaims);
router.get('/:id', claimController.getClaimById);

router.get('/', restrictTo(Role.Manager, Role.FinanceAdmin), claimController.getAllClaims);

export default router;