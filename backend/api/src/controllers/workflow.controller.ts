import { Request, Response } from 'express';
import * as claimModel from '../models/claim.model';
import * as auditModel from '../models/auditLog.model';
import * as notifModel from '../models/notification.model';
import * as userModel from '../models/user.model';
import { ClaimStatus } from '@prisma/client';

const formatSGD = (amount: number) =>
  `S$${amount.toLocaleString('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * @swagger
 * /api/workflow/pay/{id}:
 *   patch:
 *     summary: Mark an endorsed claim as paid (Finance Admin only)
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
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

    // Notify submitter the money is on the way.
    await notifModel.createNotification({
      recipientId: claim.userId,
      claimId: claim.id,
      kind: 'claim-paid',
      title: 'Reimbursed',
      body: `${formatSGD(Number(claim.amount))} for ${claim.merchant ?? claim.category} has been credited to your bank account.`,
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
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 */
export const reviewClaim = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, remarks } = req.body;

  try {
    const claim = await claimModel.findById(Number(id));
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    const reviewer = await userModel.findById(req.user!.id);
    const reviewerName = reviewer?.name ?? 'Your approving officer';

    const oldStatus = claim.status;
    const newStatus = action === 'approve' ? ClaimStatus.Endorsed : ClaimStatus.Rejected;

    const updatedClaim = await claimModel.updateClaimStatus(Number(id), newStatus);

    await auditModel.createAuditLog({
      claimId: Number(id),
      action: action === 'approve' ? 'MANAGER_APPROVAL' : 'MANAGER_REJECTION',
      performedBy: req.user!.id,
      oldStatus: oldStatus,
      newStatus: newStatus,
      remarks: remarks || '',
    });

    // Notify submitter — endorsed or rejected.
    if (action === 'approve') {
      await notifModel.createNotification({
        recipientId: claim.userId,
        claimId: claim.id,
        kind: 'claim-endorsed',
        title: 'Claim endorsed',
        body: `${reviewerName} endorsed your ${formatSGD(Number(claim.amount))} ${claim.category.toLowerCase()} claim. Awaiting finance disbursement.`,
      });
    } else {
      await notifModel.createNotification({
        recipientId: claim.userId,
        claimId: claim.id,
        kind: 'claim-rejected',
        title: 'Claim returned for fix',
        body: remarks || 'No reason given — please contact your approving officer.',
        hint: 'Open the claim to see the reason and submit a corrected one.',
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Claim ${newStatus} successfully`,
      data: { claim: updatedClaim },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
