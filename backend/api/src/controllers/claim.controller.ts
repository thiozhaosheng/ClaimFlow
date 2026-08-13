import { Request, Response } from 'express';
import * as claimModel from '../models/claim.model';
import * as auditModel from '../models/auditLog.model';
import * as notifModel from '../models/notification.model';
import * as userModel from '../models/user.model';
import { ClaimStatus, Role } from '@prisma/client';
import { parseReceipt } from '../services/receiptParser';
import { verifyParsedReceipt } from '../services/receiptChecks';
import {
  isBlobStorageConfigured,
  uploadReceipt,
  generateViewUrl,
} from '../services/blobStorage';
import { evaluateClaim } from '../services/policyEngine';

/**
 * Sanity-check the money on a claim before anything is written.
 *
 * Nothing checked these. The policy engine tests category, dates, receipts and
 * thresholds — the things a rule can be written about — and everyone assumed
 * that covered submission, so an amount of zero or a GST larger than the total
 * went straight into the database and through approval. One such claim is in
 * the demo data now: S$46.60 with S$51.19 of GST on it, which no receipt in
 * Singapore can produce and which every screen displayed without comment.
 *
 * The rules cannot express this: they compare a field against a constant, not
 * two fields against each other. It belongs here, before the write.
 *
 * @returns an error message for the caller, or null when the numbers are sound
 */
export const checkClaimAmounts = (
  amount: unknown,
  gstAmount: unknown,
): string | null => {
  const total = Number(amount);
  if (!Number.isFinite(total) || total <= 0) {
    return 'Enter a claim amount greater than zero.';
  }
  if (gstAmount === null || gstAmount === undefined || gstAmount === '') return null;

  const gst = Number(gstAmount);
  if (!Number.isFinite(gst) || gst < 0) {
    return 'Enter a GST amount of zero or more, or leave it blank.';
  }
  if (gst > total) {
    return 'GST cannot be more than the claim total.';
  }
  return null;
};

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

/**
 * May this caller see this claim?
 *
 * The department rule lived only in the LIST query — getClaimsByDepartment —
 * so every by-id route was open to any Manager in the company. A Sales
 * approver could read a Marketing claim's record, its audit trail and a signed
 * URL for its receipt, just by knowing the number, which increments. Verified
 * against the running stack before this was written.
 *
 * The rule, in one place, applied by everything that reaches a claim by id:
 *   Employee      their own claims only
 *   Manager       their own department, which is what the queue promises
 *   FinanceAdmin  everything — they settle every claim and file the GST, and
 *                 the privacy notice says so
 */
export async function canAccessClaim(
  user: { id: number; role: Role },
  claim: { userId: number },
): Promise<boolean> {
  if (user.role === Role.FinanceAdmin) return true;
  if (claim.userId === user.id) return true;
  if (user.role !== Role.Manager) return false;

  const [manager, submitter] = await Promise.all([
    userModel.findById(user.id),
    userModel.findById(claim.userId),
  ]);
  // An approver with no department has no department to approve for. Falling
  // through to "allow" here would hand them the company.
  if (!manager?.department) return false;
  return manager.department === submitter?.department;
}

const DENIED = {
  error: true,
  code: 'FORBIDDEN',
  message: 'You do not have access to this claim.',
} as const;

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
  kind: 'recommended' | 'route-to-human' | 'ocr-unavailable' | 'ocr-incomplete';
  category: string;
  amount: number;
  merchant: string | null;
  submitterName: string;
  ruleId: string;
  ruleLabel?: string;
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
    recommended: 'Ready to approve',
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
      : args.kind === 'recommended'
      ? `Within policy${args.ruleLabel ? ` (${args.ruleLabel.toLowerCase()})` : ''} and the receipt read cleanly — verify the amount against the image and approve.`
      : `${args.ruleLabel ? `${args.ruleLabel} — ` : ''}${args.ruleMessage}${args.ocrMissingFields ? ` · OCR also couldn't read: ${args.ocrMissingFields}` : ''}`;

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
  kind:
    | 'claim-endorsed'
    | 'claim-rejected'
    | 'claim-paid'
    | 'claim-edited'
    | 'receipt-needs-attention'
    | 'changes-requested';
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
 *       Runs the company approval policy against the incoming claim. The
 *       engine ADVISES — it never approves. Outcomes:
 *       - `block` → 422 with the policy message; nothing is written
 *       - `auto-approve` AND OCR read the receipt cleanly → claim is created
 *         Pending with a RECOMMENDATION recorded; the manager sees it as
 *         "ready to approve" and remains the one who approves it
 *       - `auto-approve` BUT OCR had issues → recommendation withheld; the
 *         manager is asked to verify fields against the receipt image
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

    if (!receiptUrl) {
      return res.status(400).json({ error: true, code: 'MISSING_RECEIPT', message: 'A receipt must be provided to submit a claim.' });
    }

    const amountProblem = checkClaimAmounts(amount, gstAmount);
    if (amountProblem) {
      return res
        .status(400)
        .json({ error: true, code: 'INVALID_AMOUNT', message: amountProblem });
    }

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
    const inPolicy = policy.outcome === 'auto-approve';
    const recommendApproval = inPolicy && !ocrIncomplete;

    // The engine advises; a person approves. Every claim that is not blocked
    // is created Pending — a rule match becomes a recommendation the manager
    // sees, never a status the system writes on its own. (It used to set
    // Endorsed here directly, which meant an engine bug could quietly move
    // money.)
    const initialStatus = ClaimStatus.Pending;

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
    if (recommendApproval) {
      await auditModel.createAuditLog({
        claimId: newClaim.id,
        action: 'POLICY_RECOMMENDED_APPROVAL',
        performedBy: req.user!.id,
        oldStatus: ClaimStatus.Pending,
        newStatus: ClaimStatus.Pending,
        remarks: policy.ruleId,
      });
      await notifyDepartmentManager({
        submitterId: submitter.id,
        submitterDepartment: submitter.department,
        claimId: newClaim.id,
        kind: 'recommended',
        category,
        amount: Number(amount),
        merchant: merchant ?? null,
        submitterName: submitter.name,
        ruleId: policy.ruleId,
        ruleLabel: policy.label,
        ruleMessage: policy.message,
      });
    } else if (inPolicy && ocrIncomplete) {
      // The claim is within policy, but OCR didn't fully read the receipt —
      // so the recommendation is withheld and the approver is told exactly
      // which fields were typed by hand and need checking against the image.
      await auditModel.createAuditLog({
        claimId: newClaim.id,
        action: ocrUnavailable
          ? 'RECOMMENDATION_WITHHELD_OCR_UNAVAILABLE'
          : 'RECOMMENDATION_WITHHELD_OCR_INCOMPLETE',
        performedBy: req.user!.id,
        oldStatus: ClaimStatus.Pending,
        newStatus: ClaimStatus.Pending,
        remarks: ocrUnavailable
          ? `${policy.ruleId} (recommendation withheld: OCR did not read the receipt)`
          : `${policy.ruleId} (recommendation withheld: OCR could not read ${ocrMissingFieldsList || 'some fields'})`,
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
        ruleLabel: policy.label,
        ruleMessage: policy.message,
        ocrMissingFields: ocrMissingFieldsList,
      });
      await notifySubmitter({
        submitterId: submitter.id,
        claimId: newClaim.id,
        kind: 'receipt-needs-attention',
        title: 'Your receipt needs a second look',
        body: ocrUnavailable
          ? "We couldn't read your receipt automatically, so your manager will check the details you typed against the receipt image."
          : `We couldn't read ${ocrMissingFieldsList || 'some fields'} from your receipt automatically, so your manager will check what you typed against the receipt image.`,
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
        ruleLabel: policy.label,
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
      policy: {
        ...policy,
        recommendation: recommendApproval ? 'approve' : 'review',
        recommendationWithheldByOcr: inPolicy && ocrIncomplete,
      },
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

    if (!(await canAccessClaim(req.user!, claim))) {
      return res.status(403).json(DENIED);
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

    // An edit can put the numbers wrong just as easily as a submission can, and
    // correcting an amount is the single most common edit. Whichever of the two
    // the caller left out keeps its stored value, so the pair is always checked
    // as it will actually be saved.
    const editProblem = checkClaimAmounts(
      'amount' in updates ? updates.amount : claim.amount,
      'gstAmount' in updates ? updates.gstAmount : claim.gstAmount,
    );
    if (editProblem) {
      return res
        .status(400)
        .json({ error: true, code: 'INVALID_AMOUNT', message: editProblem });
    }

    // If an approver had asked for specific fields to be corrected, saving
    // the edit closes that loop: the request is cleared, the approver is told
    // what changed, and the claim goes straight back into their queue. Without
    // this the approver would have to notice the fix themselves — which is the
    // chasing this feature exists to remove.
    const previousDetails =
      claim.details && typeof claim.details === 'object' ? (claim.details as any) : {};
    const pendingCorrection = previousDetails.correctionRequest;

    if (pendingCorrection) {
      const mergedDetails =
        'details' in updates && updates.details && typeof updates.details === 'object'
          ? { ...updates.details }
          : { ...previousDetails };
      delete mergedDetails.correctionRequest;
      updates.details = mergedDetails;
    }

    const updated = await claimModel.updateClaim(claimId, updates);

    if (pendingCorrection) {
      // The request has been answered, so the submitter's "Fix Amount on your
      // office supplies claim" notification is no longer true — it sat at the
      // top of their bell under ACTION NEEDED after they had already fixed it
      // and sent it back. Retire first, then raise the approver's new one
      // below, so the fresh notification is not swept up with the stale ones.
      await notifModel.retireForClaim(claimId);

      const askedFor: string[] = Array.isArray(pendingCorrection.fields)
        ? pendingCorrection.fields
        : [];
      const FIELD_LABELS: Record<string, string> = {
        merchant: 'Merchant',
        expenseDate: 'Expense date',
        amount: 'Amount',
        gstAmount: 'GST',
        category: 'Category',
        receipt: 'Receipt image',
      };
      const labelled = askedFor.map((f) => FIELD_LABELS[f] ?? f).join(', ');
      const submitter = await userModel.findById(claim.userId);

      await auditModel.createAuditLog({
        claimId,
        action: 'CORRECTION_SUBMITTED',
        performedBy: req.user!.id,
        oldStatus: claim.status,
        newStatus: claim.status,
        remarks: labelled ? `Corrected: ${labelled}` : 'Corrected after review',
      });

      if (pendingCorrection.requestedById) {
        await notifModel.createNotification({
          recipientId: Number(pendingCorrection.requestedById),
          claimId,
          kind: 'correction-submitted',
          title: `${submitter?.name ?? 'The submitter'} corrected ${labelled || 'the claim'}`,
          body: `${claim.category} · ${claim.merchant ?? '—'} · ${formatSGD(Number(updated?.amount ?? claim.amount))}`,
          hint: 'Re-check the corrected fields against the receipt, then approve.',
        });
      }
    }

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
    // A withdrawn claim is no longer anyone's to-do: retire its open
    // notifications so an approver's "action needed" row cannot outlive the
    // claim it points at.
    await notifModel.retireForClaim(claimId);

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

    // Nothing goes into the form unverified. A value that cannot be checked
    // against the arithmetic or the calendar is withheld and named, so the
    // submitter types that one field instead of the approver re-checking all
    // of them afterwards.
    const { parsed, checks } = verifyParsedReceipt(parseResult);

    return res.json({
      status: 'success',
      data: {
        ...parsed,
        checks,
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

    if (!(await canAccessClaim(req.user!, claim))) {
      return res.status(403).json(DENIED);
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
    // Finance sees everything — they settle every claim and file the GST, and
    // the privacy notice says so. A manager sees their own department.
    let claims;
    if (req.user!.role === Role.Manager) {
      const manager = await userModel.findById(req.user!.id);
      claims = manager?.department
        ? await claimModel.getClaimsByDepartment(manager.department)
        : [];
    } else {
      claims = await claimModel.getAllClaims();
    }
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

    if (!(await canAccessClaim(req.user!, claim))) {
      return res.status(403).json(DENIED);
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

    if (!(await canAccessClaim(req.user!, claim))) {
      return res.status(403).json(DENIED);
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
