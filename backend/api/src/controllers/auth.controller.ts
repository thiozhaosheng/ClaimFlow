import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import * as userModel from '../models/user.model';
import { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV } from '../config/constants';

const GENERIC_AUTH_ERROR = { message: 'Invalid email or password' };

// ---------------------------------------------------------------------------
// Demo-only helpers
// ---------------------------------------------------------------------------

// Small, readable random string for the demo "forgot password" flow.
function generateDemoPassword(length = 10): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no l/i/o/0/1 to avoid confusion
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findByEmail(email);

    // Always run bcrypt.compare even if user is missing to keep the response
    // time constant. This avoids leaking which emails are registered.
    const passwordHash = user?.passwordHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
    const passwordOk = await bcrypt.compare(password, passwordHash);

    if (!user || !passwordOk) {
      return res.status(401).json(GENERIC_AUTH_ERROR);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions,
    );

    return res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name ?? null,
      },
    });
  } catch (error: any) {
    console.error('[auth.login] unexpected error:', error?.message ?? error);
    return res.status(500).json({ status: 'error', message: 'Login failed' });
  }
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      department: user.department ?? null,
      avatarUrl: user.avatarUrl ?? null,
    });
  } catch (error: any) {
    console.error('[auth.me] unexpected error:', error?.message ?? error);
    return res.status(500).json({ status: 'error', message: 'Lookup failed' });
  }
};

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: (Demo) Reset a user's password and return the new value inline
 *     description: |
 *       This endpoint exists for the demo / preview environment. It
 *       generates a short random password, hashes it, persists it, and
 *       returns the plaintext so the test user can immediately copy-paste
 *       it into the sign-in form. **DO NOT ship this behaviour to
 *       production** — a real reset flow should email the new credential
 *       to the verified account address.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: New password issued }
 */
export const forgotPassword = async (req: Request, res: Response) => {
  if (NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  const { email } = req.body ?? {};
  const emailNormalised = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!emailNormalised) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await userModel.findByEmail(emailNormalised);
    // For unknown emails we still return success-shaped output so the demo
    // surface is not turned into an account-enumeration oracle.
    if (!user) {
      return res.status(200).json({
        status: 'success',
        data: {
          email: emailNormalised,
          newPassword: null,
          message:
            "If that email exists in the demo workspace, a temporary password has been issued. Try the named demo accounts (e.g. demo.employee@claimflow.com).",
        },
      });
    }

    const newPassword = generateDemoPassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userModel.update(user.id, { passwordHash });

    return res.status(200).json({
      status: 'success',
      data: {
        email: user.email,
        newPassword,
        message:
          'Temporary password issued — use it in the form above to sign in. In production, this would arrive via email instead.',
      },
    });
  } catch (error: any) {
    console.error('[auth.forgotPassword] unexpected error:', error?.message ?? error);
    return res.status(500).json({ status: 'error', message: 'Reset failed' });
  }
};
