import { Router } from 'express';
import multer from 'multer';
import * as claimController from '../controllers/claim.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (
      /^image\/(jpe?g|png|webp|heic|heif)$/.test(file.mimetype) ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, HEIC, or PDF receipts are accepted'));
    }
  },
});

router.post(
  '/parse-receipt',
  receiptUpload.single('receipt'),
  claimController.parseReceiptUpload,
);

router.post('/', claimController.createClaim);
router.get('/my', claimController.getMyClaims);
router.get('/:id/receipt', claimController.getReceiptViewUrl);
router.get('/:id', claimController.getClaimById);
router.patch('/:id/withdraw', claimController.withdrawClaim);
router.patch('/:id', claimController.editClaim);

router.get(
  '/',
  restrictTo(Role.Manager, Role.FinanceAdmin),
  claimController.getAllClaims,
);

export default router;
