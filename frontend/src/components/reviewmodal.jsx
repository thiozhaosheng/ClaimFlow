import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  ImageOff,
  Scale,
  ScanLine,
  ShieldCheck,
  Undo2,
  X,
} from "lucide-react";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";
import { useReceipt } from "../hooks/usereceipt.js";
import "./review-flow.css";

const STEPS = [
  { key: "verify", label: "Verify" },
  { key: "policy", label: "Policy" },
  { key: "decision", label: "Decision" },
];

/**
 * Human labels for the field keys the review endpoint accepts. The same
 * wording is used in the modal, in the queue chip and in the notification the
 * submitter receives, so "GST" means the same thing everywhere.
 */
export const CORRECTION_FIELD_LABELS = {
  merchant: "Merchant",
  expenseDate: "Expense date",
  amount: "Amount",
  gstAmount: "GST",
  category: "Category",
  receipt: "Receipt image",
};

export function describeCorrectionFields(fields) {
  return (fields || [])
    .map((f) => CORRECTION_FIELD_LABELS[f] || f)
    .join(", ");
}

// The receipt-vs-fields checklist. Every row must be resolved — matches or
// doesn't match — before the flow moves past Verify. `field` is the key the
// review endpoint expects when a row is sent back for correction.
function buildCheckItems(claim) {
  // What the scan could prove at capture. GST is checked against the total
  // (9/109) and the date against the claim window, both of which are
  // arithmetic rather than judgement — so an approver who trusts them has to
  // compare the two fields that remain, not all four. Absent on claims
  // submitted before this existed, and on hand-typed ones, where every row is
  // simply unmarked.
  const checks = claim.details?.receiptChecks || null;
  const verified = (key) => checks?.[key] === "verified";

  return [
    {
      key: "merchant",
      field: "merchant",
      label: CORRECTION_FIELD_LABELS.merchant,
      value: claim.merchant || "Not recorded",
      muted: !claim.merchant,
      // The scan read a name off the image. If the claim now says something
      // else, the approver is told which is which rather than being left to
      // spot it — the case this was built for is a claim reading "Cold
      // Storage" against an NTUC FairPrice receipt, where the correction that
      // was raised named the amount and the GST and both of those matched.
      conflict:
        checks?.scannedMerchant &&
        claim.merchant &&
        checks.scannedMerchant.trim().toLowerCase() !==
          claim.merchant.trim().toLowerCase()
          ? `The receipt reads ${checks.scannedMerchant}`
          : null,
    },
    {
      key: "date",
      field: "expenseDate",
      label: CORRECTION_FIELD_LABELS.expenseDate,
      value: claim.date ? formatSGDate(claim.date) : "Not recorded",
      muted: !claim.date,
      verified: verified("expenseDate"),
      verifiedNote: "within the claim window",
    },
    {
      key: "amount",
      field: "amount",
      label: CORRECTION_FIELD_LABELS.amount,
      value: formatSGD(claim.amount),
      num: true,
      verified: verified("total"),
      verifiedNote: "read off the receipt",
    },
    {
      key: "gst",
      field: "gstAmount",
      label: CORRECTION_FIELD_LABELS.gstAmount,
      value: claim.gstAmount != null ? formatSGD(claim.gstAmount) : "Not recorded",
      muted: claim.gstAmount == null,
      num: claim.gstAmount != null,
      verified: verified("gstAmount"),
      verifiedNote: "9% of the total, to the cent",
    },
  ];
}

export default function ReviewModal({ open, claim, actionType, onConfirm, onCancel }) {
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState({});
  const [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState("");
  const {
    src: receiptSrc,
    broken: receiptBroken,
    markBroken: markReceiptBroken,
  } = useReceipt(claim, open);
  const [submitting, setSubmitting] = useState(false);

  // Reset the whole flow every time the modal opens.
  useEffect(() => {
    if (open) {
      setStep(0);
      setChecks({});
      setDecision(actionType === "reject" ? "reject" : actionType === "endorse" ? "endorse" : null);
      setRemarks("");
      setSubmitting(false);
    }
  }, [open, actionType]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);


  const policy = useMemo(() => {
    if (!claim) return null;
    return evaluatePolicies(
      claimContextFromForm({
        category: claim.type,
        amount: claim.amount,
        receiptUrl: claim.receiptUrl,
        expenseDate: claim.date,
        details: claim.details || {},
      }),
    );
  }, [claim]);

  if (!open || !claim) return null;

  const checkItems = buildCheckItems(claim);
  // Every row must be resolved one way or the other. An untouched row is not
  // the same as a matching one, so Continue stays locked until each is answered.
  const allResolved = checkItems.every((item) => checks[item.key]);
  const mismatchItems = checkItems.filter((item) => checks[item.key] === "mismatch");
  const mismatchFields = mismatchItems.map((item) => item.field);
  const hasMismatch = mismatchFields.length > 0;
  const ocrFailed = claim.ocrSource === "unavailable";

  const inPolicy = policy?.outcome === "auto-approve";
  const blocked = policy?.outcome === "block";

  // Approving a claim you have just said is wrong is incoherent, so once any
  // field is marked as not matching the only live decisions are asking for a
  // correction or rejecting outright — and asking is the pre-selected one,
  // because the approver has already named what is wrong.
  const effectiveDecision = hasMismatch
    ? decision === "reject"
      ? "reject"
      : "request-changes"
    : decision;

  const canConfirm =
    allResolved &&
    effectiveDecision !== null &&
    (effectiveDecision === "endorse" ||
      effectiveDecision === "request-changes" ||
      remarks.trim().length > 0) &&
    (effectiveDecision !== "request-changes" || hasMismatch) &&
    !submitting;

  const handleConfirm = () => {
    if (!canConfirm) return;
    setSubmitting(true);
    onConfirm(
      effectiveDecision,
      remarks.trim() || null,
      effectiveDecision === "request-changes" ? mismatchFields : [],
    );
  };

  const setCheck = (key, state) =>
    setChecks((prev) => ({ ...prev, [key]: state }));

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="review-flow-title">
      <div className="modal-sheet review-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" id="review-flow-title">Review claim</h3>
          <p className="modal-subtitle">
            {claim.id} · {claim.employee} · {claim.type} · {formatSGD(claim.amount)}
          </p>
        </div>

        {/* stepper */}
        <div className="review-stepper" aria-label={`Step ${step + 1} of 3: ${STEPS[step].label}`}>
          {STEPS.map((s, i) => (
            <div key={s.key} className="contents">
              {i > 0 && <span className="review-step-line" aria-hidden="true" />}
              <span
                className={`review-step ${
                  i === step ? "review-step-current" : i < step ? "review-step-done" : ""
                }`}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="review-step-dot">
                  {i < step ? <Check className="h-3 w-3" strokeWidth={2.5} /> : i + 1}
                </span>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="modal-body">
          {/* ---- phase 1 · verify ---------------------------------- */}
          {step === 0 && (
            <>
              {ocrFailed && (
                <div className="review-banner-warning" role="alert">
                  <ScanLine className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    The receipt scan was unavailable, so every field below was
                    typed by hand. Compare each one against the image before
                    ticking it off.
                  </span>
                </div>
              )}
              <div className="review-verify-grid">
                <div className="review-receipt-pane">
                  {receiptSrc && !receiptBroken ? (
                    <>
                      <img
                        src={receiptSrc}
                        alt={`Receipt for ${claim.id}`}
                        onError={markReceiptBroken}
                      />
                      <span className="review-receipt-caption">
                        <ScanLine className="h-3 w-3" aria-hidden="true" />
                        {ocrFailed
                          ? "Stored receipt · scan unavailable"
                          : claim.ocrSource === "azure"
                            ? "Stored receipt image"
                            : "Stored receipt"}
                      </span>
                    </>
                  ) : claim.receiptUrl ? (
                    <div className="review-receipt-empty">
                      <ImageOff className="h-5 w-5" aria-hidden="true" />
                      Receipt stored, preview unavailable
                      <small>
                        The image could not be loaded here. Treat every field
                        as unverified against the receipt.
                      </small>
                    </div>
                  ) : (
                    <div className="review-receipt-empty">
                      <ImageOff className="h-5 w-5" aria-hidden="true" />
                      No receipt attached
                      <small>
                        Confirm the claim details are plausible without one, or
                        reject with a reason.
                      </small>
                    </div>
                  )}
                </div>

                <div>
                  <p className="form-hint" style={{ margin: "0 0 0.5rem" }}>
                    Say whether each field matches the receipt. Anything you
                    mark as not matching can be sent back to be fixed, without
                    killing the claim.
                  </p>
                  <div className="review-checklist" role="group" aria-label="Receipt verification checklist">
                    {checkItems.map((item) => (
                      <div
                        key={item.key}
                        className={`review-check-row${
                          checks[item.key] ? ` is-${checks[item.key]}` : ""
                        }`}
                      >
                        <div className="review-check-facts min-w-0">
                          <span className="review-check-label">{item.label}</span>
                          <span
                            className={`review-check-value${item.muted ? " is-muted" : ""}${item.num ? " is-num" : ""}`}
                          >
                            {item.value}
                          </span>
                          {item.conflict && (
                            <span className="review-check-conflict">
                              {item.conflict}
                            </span>
                          )}
                          {item.verified && !item.conflict && (
                            <span className="review-check-verified">
                              Checked: {item.verifiedNote}
                            </span>
                          )}
                        </div>
                        <div
                          className="review-check-choices"
                          role="radiogroup"
                          aria-label={`${item.label} against the receipt`}
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={checks[item.key] === "match"}
                            className="review-check-choice is-match"
                            onClick={() => setCheck(item.key, "match")}
                          >
                            <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                            Matches
                          </button>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={checks[item.key] === "mismatch"}
                            className="review-check-choice is-mismatch"
                            onClick={() => setCheck(item.key, "mismatch")}
                          >
                            <X className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                            Doesn&rsquo;t match
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMismatch && (
                    <p className="review-check-note" role="status">
                      {describeCorrectionFields(mismatchFields)}{" "}
                      {mismatchFields.length === 1 ? "goes" : "go"} back to{" "}
                      {claim.employee} to fix. The claim stays open and keeps
                      its receipt.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ---- phase 2 · policy ---------------------------------- */}
          {step === 1 && policy && (
            <>
              <div className="review-policy-card">
                <div
                  className={`review-policy-verdict ${
                    inPolicy ? "is-ready" : blocked ? "is-blocked" : "is-judgement"
                  }`}
                  role="status"
                >
                  {inPolicy ? (
                    <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  ) : blocked ? (
                    <Ban className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <div className="review-policy-headline">
                      {inPolicy
                        ? "In policy — ready to approve"
                        : `Needs your judgement: ${policy.message}`}
                    </div>
                    <div className="review-policy-sub">
                      {inPolicy
                        ? "Every configured check passed for this claim."
                        : "The engine surfaced this for a human decision — it has not rejected anything."}
                    </div>
                  </div>
                </div>
                <div className="review-policy-meta">
                  {/* "Matched rule" sat directly above "No rule matched" on
                      every claim that did not match one, which is most of
                      them. */}
                  <span className="review-policy-rule-label">
                    {policy.label ? "Matched rule" : "Policy result"}
                  </span>
                  {policy.label && (
                    <span className="review-policy-rule-chip">{policy.label}</span>
                  )}
                  <p className="review-policy-message">{policy.message}</p>
                </div>
              </div>
              <div className="review-policy-disclaimer">
                <Scale className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>
                  The policy engine recommends — it never decides. Whatever you
                  choose next is recorded in the audit trail under your name.
                </span>
              </div>
            </>
          )}

          {/* ---- phase 3 · decision -------------------------------- */}
          {step === 2 && (
            <>
              <div className="review-recap">
                <span>{claim.id}</span>
                <span>{claim.employee}</span>
                <span>{formatSGD(claim.amount)}</span>
                {policy && (
                  <span>
                    {inPolicy ? "Engine: in policy" : "Engine: needs judgement"}
                  </span>
                )}
              </div>

              {hasMismatch && (
                <div className="review-correction-callout">
                  <div className="review-correction-headline">
                    You marked these as not matching the receipt
                  </div>
                  <div className="review-correction-fields">
                    {mismatchItems.map((item) => (
                      <span key={item.key} className="review-correction-chip">
                        {item.label}
                      </span>
                    ))}
                  </div>
                  <p className="review-correction-sub">
                    Sending them back keeps {claim.id} open at its current
                    place in the queue — {claim.employee} fixes those fields in
                    the portal and it returns to you. Nothing is resubmitted
                    from scratch.
                  </p>
                </div>
              )}

              <div className="review-decision-options" role="radiogroup" aria-label="Decision">
                {hasMismatch ? (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={effectiveDecision === "request-changes"}
                    className="review-decision-option is-correct"
                    onClick={() => setDecision("request-changes")}
                  >
                    <span className="review-decision-title">
                      <Undo2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                      Request correction
                    </span>
                    <span className="review-decision-sub">
                      Send the named fields back to {claim.employee} to fix.
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={decision === "endorse"}
                    className="review-decision-option is-approve"
                    onClick={() => setDecision("endorse")}
                  >
                    <span className="review-decision-title">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                      Approve
                    </span>
                    <span className="review-decision-sub">
                      Endorse and forward to finance for payment.
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  role="radio"
                  aria-checked={effectiveDecision === "reject"}
                  className="review-decision-option is-reject"
                  onClick={() => setDecision("reject")}
                >
                  <span className="review-decision-title">
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                    Reject
                  </span>
                  <span className="review-decision-sub">
                    Close the claim. A new one has to be submitted.
                  </span>
                </button>
              </div>

              {hasMismatch && (
                <p className="review-decision-note">
                  Approve is unavailable while a field is marked as not
                  matching. Go back to Verify to change a mark.
                </p>
              )}

              <label htmlFor="review-remarks" className="form-label">
                {effectiveDecision === "reject"
                  ? "Reason for rejection (required)"
                  : effectiveDecision === "request-changes"
                    ? "Note for the submitter (optional)"
                    : "Remarks (optional)"}
              </label>
              <textarea
                id="review-remarks"
                className="form-control"
                rows="3"
                placeholder={
                  effectiveDecision === "reject"
                    ? "Explain what is wrong so the claimant can fix and resubmit."
                    : effectiveDecision === "request-changes"
                      ? "e.g. Receipt total reads S$46.60"
                      : "Add context for the audit trail if useful."
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <p className="form-hint">
                {effectiveDecision === "request-changes"
                  ? "Sent with the field names, so the submitter reads it in the portal. Recorded in the audit trail with your name."
                  : "Recorded permanently in the audit trail with your name."}
              </p>
            </>
          )}
        </div>

        <div className="modal-actions">
          {step === 0 ? (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </button>
          )}

          {step === 0 && (
            <button
              type="button"
              className="btn-primary"
              disabled={!allResolved}
              onClick={() => setStep(1)}
            >
              {allResolved
                ? "Continue to policy"
                : `Continue to policy (${checkItems.filter((i) => checks[i.key]).length} of ${checkItems.length} checked)`}
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep(2)}
            >
              Continue to decision
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              className={effectiveDecision === "reject" ? "btn-danger" : "btn-primary"}
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              {effectiveDecision === "reject"
                ? "Confirm rejection"
                : effectiveDecision === "request-changes"
                  ? "Send correction request"
                  : effectiveDecision === "endorse"
                    ? "Confirm approval"
                    : "Choose a decision"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
