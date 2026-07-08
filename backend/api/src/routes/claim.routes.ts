import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import * as claimController from '../controllers/claim.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
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

const handleMulterError = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Receipt must be 10 MB or smaller'
        : 'Invalid receipt upload';
    return res.status(400).json({ status: 'error', message });
  }
  if (err instanceof Error) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
  next(err);
};

router.post(
  '/parse-receipt',
  receiptUpload.single('receipt'),
  handleMulterError,
  claimController.parseReceiptUpload,
);

router.post('/', claimController.createClaim);
router.get('/my', claimController.getMyClaims);
router.get('/:id/receipt', claimController.getReceiptViewUrl);
router.get('/:id/activity', claimController.getClaimActivity);
router.post('/:id/comment', claimController.addComment);
router.get('/:id', claimController.getClaimById);
router.patch('/:id/withdraw', claimController.withdrawClaim);
router.patch('/:id', claimController.editClaim);

router.get(
  '/',
  restrictTo(Role.Manager, Role.FinanceAdmin),
  claimController.getAllClaims,
);

export default router;
