import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Own record only — these read the caller's id off the token.
router.get('/profile', protect, userController.getProfile);
router.get('/me/export', protect, userController.exportUserData);

// The staff directory: every user's name, email, role and department. `protect`
// alone left that readable by any employee who logged in, which is more than
// submitting a claim needs and more personal data than the PDPA position in the
// compliance docs describes collecting for that purpose. Restricted to the two
// roles that act on other people's claims. Nothing in the frontend or the
// gateway calls this, so the narrower guard breaks no caller.
router.get(
  '/',
  protect,
  restrictTo(Role.Manager, Role.FinanceAdmin),
  userController.getAllUsers,
);

// Unauthenticated by necessity: these two ARE the credential path. The auth
// gateway calls /verify to check a login and /register to create an account,
// in both cases before any token exists. Everything else on this router is
// guarded — see the comment on /update-password.
router.post('/verify', userController.verifyUser);
router.post('/register', userController.registerUser);

// `protect` here is load-bearing. Without it this endpoint reset any account's
// password given only an email address: no token, no current-password check.
// The gateway exposes it publicly at PATCH /api/users/update-password and
// forwards the Authorization header without verifying it, so the guard has to
// be on this side. The controller additionally ignores any email in the body
// and derives the account from the verified token.
router.patch('/update-password', protect, userController.updatePassword);

export default router;