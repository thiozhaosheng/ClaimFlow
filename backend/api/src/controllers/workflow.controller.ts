import { Request, Response } from 'express';
import * as claimModel from '../models/claim.model';
import * as auditModel from '../models/auditLog.model';
import { ClaimStatus } from '@prisma/client';

/**
 * @swagger
 * /api/workflow/review/{id}:
 *   patch:
 *     summary: Approve or Reject a claim
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
    const newStatus = action === 'approve' ? ClaimStatus.Approved : ClaimStatus.Rejected;

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