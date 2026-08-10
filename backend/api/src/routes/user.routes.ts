import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile', protect, userController.getProfile);
router.get('/me/export', protect, userController.exportUserData);
router.get('/', protect, userController.getAllUsers);

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