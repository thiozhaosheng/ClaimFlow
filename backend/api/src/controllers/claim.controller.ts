import { Request, Response } from 'express';
import * as claimModel from '../models/claim.model';
import { ClaimStatus, Role } from '@prisma/client';
import { parseReceipt } from '../services/receiptParser';
import {
  isBlobStorageConfigured,
  uploadReceipt,
  generateViewUrl,
} from '../services/blobStorage';

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
 *           enum: [Pending, Endorsed, Rejected, Paid]
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
    const { amount, gstAmount, merchant, category, expenseDate, receiptUrl } = req.body;

    const newClaim = await claimModel.createClaim({
      amount,
      gstAmount: gstAmount ?? null,
      merchant: merchant ?? null,
      category,
      expenseDate: new Date(expenseDate),
      receiptUrl,
      userId: req.user!.id,
      status: ClaimStatus.Pending,
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

/**
 * @swagger
 * /api/claims/parse-receipt:
 *   post:
 *     summary: Extract structured fields from a receipt image
 *     description: Accepts a receipt image (JPEG/PNG) and returns merchant, total, GST, date, and a category guess. Backed by Azure Document Intelligence when configured, falls back to a deterministic mock otherwise.
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Parsed receipt fields
 *       400:
 *         description: No file uploaded or file too large
 */
export const parseReceiptUpload = async (req: Request, res: Response) => {
  const file = (req as any).file as
    | { buffer: Buffer; mimetype: string; originalname: string }
    | undefined;
  if (!file) {
    return res.status(400).json({ message: 'No receipt file uploaded' });
  }
  try {
    // Run upload and OCR in parallel — they share the same buffer and don't depend on each other.
    const [parseResult, uploadResult] = await Promise.all([
      parseReceipt(file.buffer, file.mimetype),
      isBlobStorageConfigured
        ? uploadReceipt(file.buffer, file.mimetype, file.originalname).catch((err) => {
            console.warn('[parseReceiptUpload] blob upload failed:', err?.message);
            return null;
          })
        : Promise.resolve(null),
    ]);

    return res.json({
      status: 'success',
      data: {
        ...parseResult,
        receiptUrl: uploadResult?.blobName ?? null,
        viewUrl: uploadResult?.viewUrl ?? null,
      },
    });
  } catch (err: any) {
    console.error('[parseReceiptUpload]', err?.message ?? err);
    return res
      .status(500)
      .json({ status: 'error', message: 'Receipt parsing failed' });
  }
};

/**
 * @swagger
 * /api/claims/{id}/receipt:
 *   get:
 *     summary: Mint a short-lived SAS URL for viewing the claim's receipt image
 *     description: Returns a 15-minute signed URL pointing at the blob. Employees can only view their own claims' receipts; Manager/FinanceAdmin can view any.
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
 *         description: Signed view URL
 *       403:
 *         description: Access denied
 *       404:
 *         description: Claim not found or has no receipt
 */
export const getReceiptViewUrl = async (req: Request, res: Response) => {
  try {
    const claim = await claimModel.findById(Number(req.params.id));
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    if (req.user!.role === Role.Employee && claim.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!claim.receiptUrl) {
      return res.status(404).json({ message: 'No receipt attached to this claim' });
    }
    const viewUrl = generateViewUrl(claim.receiptUrl, 15);
    return res.status(200).json({ status: 'success', data: { viewUrl } });
  } catch (err: any) {
    console.error('[getReceiptViewUrl]', err?.message ?? err);
    return res.status(500).json({ status: 'error', message: 'Could not generate receipt URL' });
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