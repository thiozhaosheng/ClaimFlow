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

const parsePositiveIntegerParam = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

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
  const { remarks } = req.body ?? {};
  const claimId = parsePositiveIntegerParam(req.params.id);
  if (!claimId) return res.status(400).json({ message: 'Invalid claim id' });

  try {
    const claim = await claimModel.findById(claimId);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    if (claim.status !== ClaimStatus.Endorsed) {
      return res
        .status(400)
        .json({ message: 'Only Endorsed claims can be marked as Paid' });
    }

    const oldStatus = claim.status;
    const newStatus = ClaimStatus.Paid;

    const updatedClaim = await claimModel.updateClaimStatus(claimId, newStatus);

    await notifModel.retireForClaim(claimId);

    await auditModel.createAuditLog({
      claimId,
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
/**
 * Human labels for the fields an approver can send back. Kept here so the
 * notification text names the exact field ("Amount, Expense date") instead
 * of making the submitter guess what "details don't match" means.
 */
const FIELD_LABELS: Record<string, string> = {
  merchant: 'Merchant',
  expenseDate: 'Expense date',
  amount: 'Amount',
  gstAmount: 'GST',
  category: 'Category',
  receipt: 'Receipt image',
};

const labelFields = (fields: string[]) =>
  fields.map((f) => FIELD_LABELS[f] ?? f).join(', ');

export const reviewClaim = async (req: Request, res: Response) => {
  const { action, remarks, fields } = req.body;
  const claimId = parsePositiveIntegerParam(req.params.id);
  if (!claimId) return res.status(400).json({ message: 'Invalid claim id' });

  if (action !== 'approve' && action !== 'reject' && action !== 'request-changes') {
    return res
      .status(400)
      .json({ message: 'Action must be approve, reject or request-changes' });
  }

  // Asking for a correction has to name what is wrong, otherwise it is just a
  // rejection with extra steps and the approver ends up chasing the submitter
  // by message anyway — the exact double-handling this replaces.
  if (action === 'request-changes') {
    const list: string[] = Array.isArray(fields) ? fields.filter((f) => typeof f === 'string') : [];
    if (list.length === 0) {
      return res.status(400).json({
        message: 'Say which fields do not match so the submitter knows what to fix.',
      });
    }
  }

  try {
    const claim = await claimModel.findById(claimId);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    const reviewer = await userModel.findById(req.user!.id);
    const reviewerName = reviewer?.name ?? 'Your approving officer';

    const oldStatus = claim.status;

    // ---- request-changes: the claim stays alive -------------------------
    // It remains Pending and keeps its receipt, its OCR result and its id.
    // The submitter fixes the named fields in place and it comes straight
    // back — no resubmission from scratch, no chasing.
    if (action === 'request-changes') {
      const list: string[] = (fields as string[]).filter((f) => typeof f === 'string');
      const existingDetails =
        claim.details && typeof claim.details === 'object' ? (claim.details as any) : {};
      const updated = await claimModel.updateClaim(claimId, {
        details: {
          ...existingDetails,
          correctionRequest: {
            fields: list,
            note: typeof remarks === 'string' ? remarks : '',
            requestedBy: reviewerName,
            requestedById: req.user!.id,
            requestedAt: new Date().toISOString(),
          },
        },
      } as any);

      await auditModel.createAuditLog({
        claimId,
        action: 'CHANGES_REQUESTED',
        performedBy: req.user!.id,
        oldStatus,
        newStatus: oldStatus,
        remarks: `${labelFields(list)}${remarks ? ` — ${remarks}` : ''}`,
      });

      await notifModel.retireForClaim(claimId);
      await notifModel.createNotification({
        recipientId: claim.userId,
        claimId: claim.id,
        kind: 'changes-requested',
        title: `Fix ${labelFields(list)} on your ${claim.category.toLowerCase()} claim`,
        body: remarks
          ? `${reviewerName}: ${remarks}`
          : `${reviewerName} checked your receipt and these do not match: ${labelFields(list)}.`,
        hint: 'Open the claim, correct those fields and save — it goes straight back for approval.',
      });

      return res.status(200).json({
        status: 'success',
        message: 'Correction requested',
        data: { claim: updated },
      });
    }

    const newStatus = action === 'approve' ? ClaimStatus.Endorsed : ClaimStatus.Rejected;

    const updatedClaim = await claimModel.updateClaimStatus(claimId, newStatus);

    // The decision retires every open notification about this claim — the
    // approver's "action needed" row must not outlive the action.
    await notifModel.retireForClaim(claimId);

    await auditModel.createAuditLog({
      claimId,
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
