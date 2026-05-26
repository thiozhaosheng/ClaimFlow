import { Request, Response } from 'express';
import * as claimModel from '../models/claim.model';
import * as auditModel from '../models/auditLog.model';
import { ClaimStatus } from '@prisma/client';

/**
 * @swagger
 * /api/workflow/pay/{id}:
 *   patch:
 *     summary: Mark an endorsed claim as paid (Finance Admin only)
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Claim marked as Paid and audited
 *       400:
 *         description: Claim is not in an Endorsed state
 *       404:
 *         description: Claim not found
 */
export const markAsPaid = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body ?? {};

  try {
    const claim = await claimModel.findById(Number(id));
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    if (claim.status !== ClaimStatus.Endorsed) {
      return res
        .status(400)
        .json({ message: 'Only Endorsed claims can be marked as Paid' });
    }

    const oldStatus = claim.status;
    const newStatus = ClaimStatus.Paid;

    const updatedClaim = await claimModel.updateClaimStatus(Number(id), newStatus);

    await auditModel.createAuditLog({
      claimId: Number(id),
      action: 'FINANCE_REIMBURSEMENT',
      performedBy: req.user!.id,
      oldStatus,
      newStatus,
      remarks: remarks || '',
    });

    return res.status(200).json({
      status: 'success',
      message: 'Claim marked as Paid',
      data: { claim: updatedClaim },
    });
  } catch (error: any) {
    console.error('[workflow.markAsPaid]', error?.message ?? error);
    return res.status(500).json({ status: 'error', message: 'Failed to mark claim as paid' });
  }
};

/**
 * @swagger
 * /api/workflow/audit:
 *   get:
 *     summary: Get full audit trail (Finance Admin only)
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all audit log entries with executor metadata
 */
export const getAuditTrail = async (_req: Request, res: Response) => {
  try {
    const logs = await auditModel.getAllAuditLogs();
    return res.status(200).json({
      status: 'success',
      results: logs.length,
      data: { logs },
    });
  } catch (error: any) {
    console.error('[workflow.getAuditTrail]', error?.message ?? error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch audit trail' });
  }
};

/**
 * @swagger
 * /api/workflow/review/{id}:
 *   patch:
 *     summary: Endorse or Reject a claim
 *     description: Updates claim status and records an entry in the audit_logs table.
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               remarks:
 *                 type: string
 *                 description: Required for rejections, optional for approvals.
 *     responses:
 *       200:
 *         description: Claim status updated and audited successfully
 *       404:
 *         description: Claim not found
 */
export const reviewClaim = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, remarks } = req.body;

  try {
    const claim = await claimModel.findById(Number(id));
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    const oldStatus = claim.status;
    const newStatus = action === 'approve' ? ClaimStatus.Endorsed : ClaimStatus.Rejected;

    const updatedClaim = await claimModel.updateClaimStatus(Number(id), newStatus);

    await auditModel.createAuditLog({
      claimId: Number(id),
      action: action === 'approve' ? 'MANAGER_APPROVAL' : 'MANAGER_REJECTION',
      performedBy: req.user!.id,
      oldStatus: oldStatus,
      newStatus: newStatus,
      remarks: remarks || ''
    });

    res.status(200).json({
      status: 'success',
      message: `Claim ${newStatus} successfully`,
      data: { claim: updatedClaim }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};