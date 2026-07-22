import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import * as userModel from '../models/user.model';
import { db } from '../config/database';
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
    const users = await userModel.findAll();
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

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, department } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(400).json({ status: 'error', message: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.createUser({
      email,
      name,
      passwordHash,
      role,
      department
    });

    res.status(201).json({ status: 'success', data: { user } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    logUtil.info('Updating password for:', email);

    const user = await userModel.findByEmail(email);

    if (!user) {
      logUtil.error(`Update failed: User with email ${email} not found`);
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userModel.update(user.id, { passwordHash });

    logUtil.info('Password updated successfully');
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