import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import * as userModel from '../models/user.model';
import { db } from '../config/database';
import { Role } from '@prisma/client';
import { logUtil } from '../utils/logUtil';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [Employee, Manager, FinanceAdmin]
 *         department:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'No user ID provided'  });
    }

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found'  });

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Connectivity Test)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users retrieved from Supabase
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // findAll() returns whole User rows, passwordHash included. Serialising
    // those straight to the client handed out every credential hash in the
    // system, so the field is stripped here rather than trusted not to matter.
    const users = (await userModel.findAll()).map(({ passwordHash, ...safe }) => safe);
    res.status(200).json({ status: 'success', results: users.length, data: { users } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Invalid credentials'  });
    }

    // Without this the row goes out whole, and the gateway's POST
    // /api/users/login relays it to the browser — so a successful sign-in
    // answered with the account's own bcrypt hash. Verified against the
    // running stack. getAllUsers already stripped it; this path did not.
    const { passwordHash, ...safe } = user;
    res.status(200).json({ status: 'success', data: { user: safe } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, department } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(400).json({ status: 'error', message: 'User already exists' });

    // The role has to be one of the three the schema knows. Without the check
    // an unexpected value reaches Prisma as an enum error, and the message
    // that comes back describes the database.
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({
        error: true,
        code: 'BAD_REQUEST',
        message: `Role must be one of: ${Object.values(Role).join(', ')}`,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.createUser({
      email,
      name,
      passwordHash,
      role,
      department
    });

    const { passwordHash: _hash, ...safe } = user;
    res.status(201).json({ status: 'success', data: { user: safe } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

/**
 * Changes the password of the *authenticated* caller.
 *
 * The account is taken from the verified JWT, never from the request body. An
 * earlier version read `email` off the body and reset whatever account it
 * named, with no token required — an unauthenticated takeover of any account
 * whose email was known, which for the seeded demo accounts is all of them.
 * Two things close that: `protect` on the route, and proof of the current
 * password here, so a stolen session alone cannot change credentials.
 */
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({
        error: true,
        code: 'BAD_REQUEST',
        message: 'currentPassword and newPassword are required',
      });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      logUtil.error(`Update failed: user ${userId} from a valid token no longer exists`);
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      logUtil.error(`Update failed: wrong current password for user ${userId}`);
      return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userModel.update(user.id, { passwordHash });

    logUtil.info(`Password updated for user ${userId}`);
    res.status(200).json({ status: 'success', message: 'Password updated' });
  } catch (error: any) {
    logUtil.error('Database error during password update:', error);
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const exportUserData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: true, code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'User not found' });
    }

    const { passwordHash, ...userExport } = user;

    // Retrieve user's claims and linked audit logs
    const claims = await db.claim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const claimIds = claims.map((c) => c.id);

    const auditLogs = claimIds.length > 0 ? await db.auditLog.findMany({
      where: { claimId: { in: claimIds } },
      orderBy: { createdAt: 'asc' },
      include: {
        executor: { select: { id: true, name: true, role: true } },
      },
    }) : [];

    // Redact third-party names to comply with PDPA DSAR QA checklist (B2)
    const sanitizedAuditLogs = auditLogs.map((log: any) => {
      const isSelf = log.performedBy === userId;
      return {
        id: log.id,
        claimId: log.claimId,
        action: log.action,
        performedBy: isSelf ? log.performedBy : undefined,
        performerRole: log.executor?.role ?? 'System',
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        remarks: log.remarks,
        createdAt: log.createdAt,
      };
    });

    // A subject access request is the moment a complete copy of someone's
    // personal data leaves the building, and it was the one action in the
    // product that happened with no record at all.
    //
    // It is recorded here rather than in AuditLog because AuditLog hangs off a
    // claim — claimId is required — and a data export is an event about an
    // ACCOUNT, not about any one claim. Anchoring it to, say, the caller's
    // most recent claim would put "Data exported" in that claim's history,
    // where it does not belong and would read as something that happened to
    // that claim. Account-level events belong in the application log until
    // there is a table for them.
    logUtil.info(
      `[DSAR] user ${userId} exported their own data: ${claims.length} claim(s), ${sanitizedAuditLogs.length} history entries`,
    );

    return res.status(200).json({
      status: 'success',
      exportedAt: new Date().toISOString(),
      data: {
        user: userExport,
        claims,
        auditLogs: sanitizedAuditLogs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message });
  }
};