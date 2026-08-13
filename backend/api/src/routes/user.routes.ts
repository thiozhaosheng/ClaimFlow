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

// Unauthenticated by necessity: /verify IS the credential path. The auth
// gateway calls it to check a login, before any token exists.
router.post('/verify', userController.verifyUser);

// Registration is an ADMIN action, not a public one.
//
// This route was open, and the gateway exposes it at POST /api/users/register
// with nothing but a rate limit in front of it. The controller takes `role`
// straight from the body, so an anonymous request could create itself a
// FinanceAdmin and then read every claim in the company and the whole staff
// directory. Verified against the running stack before this was written: one
// unauthenticated POST, then 142 claims and 29 staff records.
//
// Nothing calls it — not the frontend, not the tests — so the guard costs
// nothing. The sign-in page already says accounts are created by the finance
// administrator; this makes that true.
router.post(
  '/register',
  protect,
  restrictTo(Role.FinanceAdmin),
  userController.registerUser,
);

// `protect` here is load-bearing. Without it this endpoint reset any account's
// password given only an email address: no token, no current-password check.
// The gateway exposes it publicly at PATCH /api/users/update-password and
// forwards the Authorization header without verifying it, so the guard has to
// be on this side. The controller additionally ignores any email in the body
// and derives the account from the verified token.
router.patch('/update-password', protect, userController.updatePassword);

export default router;