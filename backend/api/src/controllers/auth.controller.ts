import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as userModel from '../models/user.model';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/constants';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findByEmail(email);

    if (!user || password !== user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      status: 'success',
      token,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};