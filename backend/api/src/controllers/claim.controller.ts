import { Request, Response } from 'express';
import * as claimModel from '../models/claim.model';
import * as auditModel from '../models/auditLog.model';
import * as notifModel from '../models/notification.model';
import * as userModel from '../models/user.model';
import { ClaimStatus, Role } from '@prisma/client';
import { parseReceipt } from '../services/receiptParser';
import {
  isBlobStorageConfigured,
  uploadReceipt,
  generateViewUrl,
} from '../services/blobStorage';
import { evaluateClaim } from '../services/policyEngine';

/**
 * @swagger
 * components:
 *   schemas:
 *     Claim:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         userId: { type: integer }
 *         amount: { type: number }
 *         category: { type: string }
 *         expenseDate: { type: string, format: date-time }
 *         receiptUrl: { type: string, nullable: true }
 *         ocrSource: { type: string, nullable: true, enum: [azure, mock, unavailable] }
 *         status: { type: string, enum: [Pending, Endorsed, Rejected, Paid] }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLM = (id: number) => `CLM-${String(id).padStart(3, '0')}`;

const parsePositiveIntegerParam = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const formatSGD = (amount: number) =>
  `S$${amount.toLocaleString('en-SG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

async function notifyDepartmentManager(args: {
  submitterId: number;
  submitterDepartment: string | null;
  claimId: number;
  kind: 'auto-endorsed' | 'route-to-human' | 'ocr-unavailable' | 'ocr-incomplete';
  category: string;
  amount: number;
  merchant: string | null;
  submitterName: string;
  ruleId: string;
  ruleMessage: string;
  // Which fields the scan couldn't read, e.g. "Merchant, Date" — only set
  // for the ocr-incomplete kind, used to make the hint specific instead of
  // a generic "something's missing" message.
  ocrMissingFields?: string;
}) {
  // Find managers in the same department; fall back to any manager.
  const managers = await userModel.findAll();
  const sameDept = managers.filter(
    (u) =>
      u.role === Role.Manager &&
      args.submitterDepartment !== null &&
      u.department === args.submitterDepartment,
  );
  const candidates = sameDept.length > 0 ? sameDept : managers.filter((u) => u.role === Role.Manager);
  if (candidates.length === 0) return;

  const titlePrefix = {
    'auto-endorsed': 'Auto-endorsed',
    'route-to-human': 'New claim to review',
    'ocr-unavailable': 'Manual review needed',
    'ocr-incomplete': 'Manual review needed',
  }[args.kind];

  const body = `${args.category} · ${args.merchant ?? '—'} · ${formatSGD(args.amount)}`;
  const hint =
    args.kind === 'ocr-unavailable'
      ? 'OCR could not read the receipt at all — verify every field against the receipt image.'
      : args.kind === 'ocr-incomplete'
      ? `OCR couldn't read: ${args.ocrMissingFields || 'some fields'} — the submitter entered ${args.ocrMissingFields?.includes(',') ? 'these' : 'this'} by hand. Verify against the receipt image.`
      : `Rule: ${args.ruleId} — ${args.ruleMessage}${args.ocrMissingFields ? ` · OCR also couldn't read: ${args.ocrMissingFields}` : ''}`;

  await Promise.all(
    candidates.map((manager) =>
      notifModel.createNotification({
        recipientId: manager.id,
        claimId: args.claimId,
        kind: args.kind,
        title: `${titlePrefix}: ${args.submitterName}`,
        body,
        hint,
      }),
    ),
  );
}

async function notifySubmitter(args: {
  submitterId: number;
  claimId: number;
  kind: 'claim-endorsed' | 'claim-rejected' | 'claim-paid' | 'claim-edited' | 'receipt-needs-attention';
  title: string;
  body: string;
  hint?: string;
}) {
  await notifModel.createNotification({
    recipientId: args.submitterId,
    claimId: args.claimId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    hint: args.hint,
  });
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /api/claims:
 *   post:
 *     summary: Submit a new expense claim
 *     description: |
 *       Runs the company approval policy against the incoming claim. Outcomes:
 *       - `block` → 422 with the policy message
 *       - `auto-approve` AND OCR was successful → status set to Endorsed, audit
 *         entry written, dept. manager notified for visibility
 *       - `auto-approve` BUT OCR source is `unavailable` → suppressed; claim
 *         goes to Pending and dept. manager is asked to manually verify
 *       - `route-to-human` → Pending; dept. manager notified with the matched
 *         rule as a hint
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 */
export const createClaim = async (req: Request, res: Response) => {
  try {
    const {
      amount,
      gstAmount,
      merchant,
      category,
      expenseDate,
      receiptUrl,
      ocrSource,
      details,
    } = req.body;

    const submitter = await userModel.findById(req.user!.id);
    if (!submitter) return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Submitter not found'  });

    // Policy engine needs access to the details object for rules that
    // target nested paths (e.g. "details.businessJustification").
    const policy = evaluateClaim({
      amount: Number(amount),
      gstAmount: gstAmount ?? null,
      merchant: merchant ?? null,
      category,
      expenseDate,
      receiptUrl: receiptUrl ?? null,
      details: details ?? {},
    } as any);

    // Block outcome — refuse the submission.
    if (policy.outcome === 'block') {
      return res.status(422).json({
        status: 'error',
        message: policy.message,
        policy,
      });
    }

    // OCR-issue suppression: even if the rule says auto-approve, a receipt
    // OCR couldn't fully read means the manager must double-check the
    // manually-entered fields against the receipt image. Covers both a full
    // failure (ocrSource === 'unavailable') and a partial read (some fields
    // came back but not all — flagged by the frontend as details.ocrIncomplete,
    // e.g. the scan found the merchant but not the date).
    const ocrUnavailable = ocrSource === 'unavailable';
    const ocrIncomplete = ocrUnavailable || details?.ocrIncomplete === true;
    const ocrMissingFieldsList: string =
      typeof details?.ocrMissingFields === 'string' ? details.ocrMissingFields : '';
    const wouldAutoApprove = policy.outcome === 'auto-approve';
    const autoApprove = wouldAutoApprove && !ocrIncomplete;

    const initialStatus = autoApprove ? ClaimStatus.Endorsed : ClaimStatus.Pending;

    const newClaim = await claimModel.createClaim({
      amount,
      gstAmount: gstAmount ?? null,
      merchant: merchant ?? null,
      category,
      expenseDate: new Date(expenseDate),
      receiptUrl,
      ocrSource: ocrSource ?? null,
      details: details ?? undefined,
      userId: req.user!.id,
      status: initialStatus,
    });

    // ---- audit + notifications -----------------------------------------
    if (autoApprove) {
      await auditModel.createAuditLog({
        claimId: newClaim.id,
        action: 'AUTO_APPROVAL_BY_POLICY',
        performedBy: req.user!.id,
        oldStatus: ClaimStatus.Pending,
        newStatus: ClaimStatus.Endorsed,
        remarks: policy.ruleId,
      });
      await notifyDepartmentManager({
        submitterId: submitter.id,
        submitterDepartment: submitter.department,
        claimId: newClaim.id,
        kind: 'auto-endorsed',
        category,
        amount: Number(amount),
        merchant: merchant ?? null,
        submitterName: submitter.name,
        ruleId: policy.ruleId,
        ruleMessage: policy.message,
      });
    } else if (wouldAutoApprove && ocrIncomplete) {
      // Auto-approve was suppressed because OCR didn't fully read the
      // receipt (either it failed outright, or read some fields but not
      // all) — log + notify the approver so they know to do a manual check,
      // and notify the submitter too so they know why their claim didn't
      // auto-endorse like usual.
      await auditModel.createAuditLog({
        claimId: newClaim.id,
        action: ocrUnavailable
          ? 'AUTO_APPROVAL_SUPPRESSED_OCR_UNAVAILABLE'
          : 'AUTO_APPROVAL_SUPPRESSED_OCR_INCOMPLETE',
        performedBy: req.user!.id,
        oldStatus: ClaimStatus.Pending,
        newStatus: ClaimStatus.Pending,
        remarks: ocrUnavailable
          ? `${policy.ruleId} (suppressed because OCR did not read the receipt)`
          : `${policy.ruleId} (suppressed because OCR could not read: ${ocrMissingFieldsList || 'some fields'})`,
      });
      await notifyDepartmentManager({
        submitterId: submitter.id,
        submitterDepartment: submitter.department,
        claimId: newClaim.id,
        kind: ocrUnavailable ? 'ocr-unavailable' : 'ocr-incomplete',
        category,
        amount: Number(amount),
        merchant: merchant ?? null,
        submitterName: submitter.name,
        ruleId: policy.ruleId,
        ruleMessage: policy.message,
        ocrMissingFields: ocrMissingFieldsList,
      });
      await notifySubmitter({
        submitterId: submitter.id,
        claimId: newClaim.id,
        kind: 'receipt-needs-attention',
        title: 'Your receipt needs a second look',
        body: ocrUnavailable
          ? "We couldn't read your receipt automatically, so this claim is going to your manager for manual review instead of auto-approving."
          : `We couldn't read ${ocrMissingFieldsList || 'some fields'} from your receipt automatically, so this claim is going to your manager for manual review instead of auto-approving.`,
        hint: 'This is expected — no action needed unless your approver reaches out with a question.',
      });
    } else {
      // route-to-human (or default) — log + notify approver with rule hint.
      // This claim needs human review regardless of OCR, but if the receipt
      // also had OCR issues that's worth flagging in the same notification
      // rather than silently dropping it — and the submitter still deserves
      // to know their receipt didn't scan cleanly.
      await auditModel.createAuditLog({
        claimId: newClaim.id,
        action: 'ROUTED_TO_HUMAN',
        performedBy: req.user!.id,
        oldStatus: ClaimStatus.Pending,
        newStatus: ClaimStatus.Pending,
        remarks: ocrIncomplete
          ? `${policy.ruleId} (also: OCR could not read ${ocrUnavailable ? 'the receipt' : ocrMissingFieldsList || 'some fields'})`
          : policy.ruleId,
      });
      await notifyDepartmentManager({
        submitterId: submitter.id,
        submitterDepartment: submitter.department,
        claimId: newClaim.id,
        kind: 'route-to-human',
        category,
        amount: Number(amount),
        merchant: merchant ?? null,
        submitterName: submitter.name,
        ruleId: policy.ruleId,
        ruleMessage: policy.message,
        ocrMissingFields: ocrIncomplete ? ocrUnavailable ? 'the whole receipt' : ocrMissingFieldsList : undefined,
      });
      if (ocrIncomplete) {
        await notifySubmitter({
          submitterId: submitter.id,
          claimId: newClaim.id,
          kind: 'receipt-needs-attention',
          title: 'Your receipt needs a second look',
          body: ocrUnavailable
            ? "We couldn't read your receipt automatically — your manager will verify the details you entered."
            : `We couldn't read ${ocrMissingFieldsList || 'some fields'} from your receipt automatically — your manager will verify the details you entered.`,
          hint: 'This is expected — no action needed unless your approver reaches out with a question.',
        });
      }
    }

    res.status(201).json({
      status: 'success',
      data: { claim: newClaim },
      policy: { ...policy, autoApproveSuppressedByOcr: wouldAutoApprove && ocrUnavailable },
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getMyClaims = async (req: Request, res: Response) => {
  try {
    const claims = await claimModel.getClaimsByUser(req.user!.id);
    res.status(200).json({ status: 'success', results: claims.length, data: { claims } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const getClaimById = async (req: Request, res: Response) => {
  try {
    const claimId = parsePositiveIntegerParam(req.params.id);
    if (!claimId) return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Invalid claim id'  });

    const claim = await claimModel.findById(claimId);

    if (!claim) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Claim not found'  });
    }

    if (req.user!.role === Role.Employee && claim.userId !== req.user!.id) {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Access denied'  });
    }

    res.status(200).json({ status: 'success', data: { claim } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const editClaim = async (req: Request, res: Response) => {
  try {
    const claimId = parsePositiveIntegerParam(req.params.id);
    if (!claimId) return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Invalid claim id'  });

    const claim = await claimModel.findById(claimId);
    if (!claim) return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Claim not found'  });
    if (claim.userId !== req.user!.id) {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Only the submitter can edit this claim'  });
    }
    if (claim.status !== ClaimStatus.Pending) {
      return res.status(422).json({ error: true, code: 'UNPROCESSABLE_ENTITY', message: 'Only pending claims can be edited'  });
    }
    const updates: any = {};
    const allowed = ['amount', 'gstAmount', 'merchant', 'category', 'expenseDate', 'details'];
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    if (updates.expenseDate) updates.expenseDate = new Date(updates.expenseDate);

    const updated = await claimModel.updateClaim(claimId, updates);
    res.status(200).json({ status: 'success', data: { claim: updated } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const withdrawClaim = async (req: Request, res: Response) => {
  try {
    const claimId = parsePositiveIntegerParam(req.params.id);
    if (!claimId) return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Invalid claim id'  });

    const claim = await claimModel.findById(claimId);
    if (!claim) return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Claim not found'  });
    if (claim.userId !== req.user!.id) {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Only the submitter can withdraw this claim'  });
    }
    if (claim.status !== ClaimStatus.Pending) {
      return res.status(422).json({ error: true, code: 'UNPROCESSABLE_ENTITY', message: 'Only pending claims can be withdrawn'  });
    }
    const updated = await claimModel.updateClaim(claimId, {
      withdrawn: true,
      withdrawnAt: new Date(),
    });
    await auditModel.createAuditLog({
      claimId: claim.id,
      action: 'WITHDRAWN_BY_SUBMITTER',
      performedBy: req.user!.id,
      oldStatus: claim.status,
      newStatus: claim.status,
      remarks: 'Soft-delete; record retained for dispute retrieval',
    });
    res.status(200).json({ status: 'success', data: { claim: updated } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const parseReceiptUpload = async (req: Request, res: Response) => {
  const file = (req as any).file as
    | { buffer: Buffer; mimetype: string; originalname: string }
    | undefined;
  if (!file) {
    return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'No receipt file uploaded'  });
  }
  try {
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
    return res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'Receipt parsing failed'  });
  }
};

export const getReceiptViewUrl = async (req: Request, res: Response) => {
  try {
    const claimId = parsePositiveIntegerParam(req.params.id);
    if (!claimId) return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Invalid claim id'  });

    const claim = await claimModel.findById(claimId);
    if (!claim) return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Claim not found'  });

    if (req.user!.role === Role.Employee && claim.userId !== req.user!.id) {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Access denied'  });
    }
    if (!claim.receiptUrl) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'No receipt attached to this claim'  });
    }
    const viewUrl = generateViewUrl(claim.receiptUrl, 15);
    return res.status(200).json({ status: 'success', data: { viewUrl } });
  } catch (err: any) {
    console.error('[getReceiptViewUrl]', err?.message ?? err);
    return res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: 'Could not generate receipt URL'  });
  }
};

export const getAllClaims = async (req: Request, res: Response) => {
  try {
    const claims = await claimModel.getAllClaims();
    res.status(200).json({ status: 'success', results: claims.length, data: { claims } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const getClaimActivity = async (req: Request, res: Response) => {
  try {
    const claimId = parsePositiveIntegerParam(req.params.id);
    if (!claimId) return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Invalid claim id'  });

    const claim = await claimModel.findById(claimId);
    if (!claim) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Claim not found'  });
    }

    if (req.user!.role === Role.Employee && claim.userId !== req.user!.id) {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Access denied'  });
    }

    const logs = await auditModel.getAuditLogsByClaim(claimId);
    res.status(200).json({ status: 'success', data: { logs } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const claimId = parsePositiveIntegerParam(req.params.id);
    if (!claimId) return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Invalid claim id'  });

    const { commentText } = req.body;
    const normalizedComment =
      typeof commentText === 'string' ? commentText.trim() : '';
    if (normalizedComment.length === 0 || normalizedComment.length > 2000) {
      return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'Comment text must be between 1 and 2000 characters',
       });
    }

    const claim = await claimModel.findById(claimId);
    if (!claim) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Claim not found'  });
    }

    if (req.user!.role === Role.Employee && claim.userId !== req.user!.id) {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Access denied'  });
    }

    const log = await auditModel.createAuditLog({
      claimId,
      action: 'COMMENT',
      performedBy: req.user!.id,
      oldStatus: claim.status,
      newStatus: claim.status,
      remarks: normalizedComment,
    });

    res.status(201).json({ status: 'success', data: { log } });
  } catch (error: any) {
    res.status(500).json({ error: true, code: 'INTERNAL_ERROR', message: error.message  });
  }
};

// re-export helper so the workflow controller can use it
export { notifySubmitter };
