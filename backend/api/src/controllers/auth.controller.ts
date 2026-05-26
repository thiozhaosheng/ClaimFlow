import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as userModel from '../models/user.model';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/constants';

const GENERIC_AUTH_ERROR = { message: 'Invalid email or password' };

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
    });
  } catch (error: any) {
    console.error('[auth.me] unexpected error:', error?.message ?? error);
    return res.status(500).json({ status: 'error', message: 'Lookup failed' });
  }
};
