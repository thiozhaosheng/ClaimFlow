import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWT_SECRET } from '../config/constants';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: Role;
      };
    }
  }
}

/**
 * The one route that cannot send an Authorization header.
 *
 * EventSource has no way to set request headers, so the notification stream
 * passes its token in the query string. Every OTHER protected route accepted
 * one there too, which put a bearer token into anything that records a URL:
 * access logs, browser history, a Referer header on the way to a third party.
 * The exception is now named rather than global.
 */
export const allowQueryToken = (req: Request, _res: Response, next: NextFunction) => {
  (req as any).allowQueryToken = true;
  next();
};

export const protect = (req: Request, res: Response, next: NextFunction): void | Response => {
  let token = '';

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (
    (req as any).allowQueryToken &&
    req.query.token &&
    typeof req.query.token === 'string'
  ) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, invalid or missing token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: Role };
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};