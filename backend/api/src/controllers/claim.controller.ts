import { Request, Response } from 'express';
import * as claimModel from '../models/claim.model';
import { ClaimStatus, Role } from '@prisma/client';

/**
 * @swagger
 * components:
 *   schemas:
 *     Claim:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         amount:
 *           type: number
 *         category:
 *           type: string
 *         expenseDate:
 *           type: string
 *           format: date-time
 *         receiptUrl:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [Submitted, Pending Review, Approved, Rejected, Reimbursed]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/claims:
 *   post:
 *     summary: Submit a new expense claim
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, category, expenseDate]
 *             properties:
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               expenseDate:
 *                 type: string
 *                 format: date
 *               receiptUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Claim created successfully
 *   get:
 *     summary: Get all claims (Manager/Finance Admin only)
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all claims
 */

/**
 * @swagger
 * /api/claims/my:
 *   get:
 *     summary: Get claims submitted by the current user
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's claims retrieved successfully
 */

/**
 * @swagger
 * /api/claims/{id}:
 *   get:
 *     summary: Get a specific claim by ID
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Claim details
 *       403:
 *         description: Access denied (if Employee tries to view another user's claim)
 */

export const createClaim = async (req: Request, res: Response) => {
  try {
    const { amount, category, expenseDate, receiptUrl } = req.body;
    
    const newClaim = await claimModel.createClaim({
      amount,
      category,
      expenseDate: new Date(expenseDate),
      receiptUrl,
      userId: req.user!.id,
      status: ClaimStatus.Submitted
    });

    res.status(201).json({ status: 'success', data: { claim: newClaim } });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getMyClaims = async (req: Request, res: Response) => {
  try {
    const claims = await claimModel.getClaimsByUser(req.user!.id);
    res.status(200).json({ status: 'success', results: claims.length, data: { claims } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getClaimById = async (req: Request, res: Response) => {
  try {
    const claim = await claimModel.findById(Number(req.params.id));

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    if (req.user!.role === Role.Employee && claim.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ status: 'success', data: { claim } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAllClaims = async (req: Request, res: Response) => {
  try {
    const claims = await claimModel.getAllClaims();
    res.status(200).json({ status: 'success', results: claims.length, data: { claims } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};