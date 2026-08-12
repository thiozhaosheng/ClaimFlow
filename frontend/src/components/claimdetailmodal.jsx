import { useEffect, useMemo } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Ban,
  Eye,
  ScanLine,
  History,
  X,
} from "lucide-react";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import {
  evaluatePolicies,
  claimContextFromForm,
} from "../lib/policy.js";
import categoryFields from "../data/categoryFields.json";

const STATUS_KEYS = {
  Pending: "pending",
  Endorsed: "endorsed",
  Paid: "paid",
  Rejected: "rejected",
};

const POLICY_LABEL = {
  "auto-approve": "Within policy on every check",
  "route-to-human": "Flagged for your review",
  block: "Blocked at submission by policy",
};

const POLICY_ICON = {
  "auto-approve": ShieldCheck,
  "route-to-human": AlertTriangle,
  block: Ban,
};

// Generate "where to look" hints based on the matched policy + claim data.
function buildFieldHints(claim, policy) {
  const hints = [];

  if (claim.ocrSource === "unavailable") {
    hints.push({
      field: "Receipt",
      message:
        "OCR could not read this receipt. Open the image and verify amount, merchant and date match what was entered.",
      tone: "warning",
      icon: ScanLine,
    });
  }

  if (policy?.ruleId === "route-large-amount") {
    hints.push({
      field: "Amount",
      message: `${formatSGD(claim.amount)} is above S$500, so it always needs manager review — confirm there's a business justification.`,
      tone: "warning",
      icon: AlertTriangle,
    });
  }

  if (policy?.ruleId === "block-missing-receipt-over-threshold") {
    hints.push({
      field: "Receipt",
      message: `Receipt is required for claims above S$50 — none attached.`,
      tone: "danger",
      icon: Ban,
    });
  }

  if (policy?.ruleId === "block-disallowed-category") {
    hints.push({
      field: "Category",
      message: `"${claim.type}" is on the IRAS disallowed list — cannot be reimbursed.`,
      tone: "danger",
      icon: Ban,
    });
  }

  if (policy?.ruleId === "block-future-date") {
    hints.push({
      field: "Date",
      message: `Expense date is in the future — submit again after the expense actually happens.`,
      tone: "danger",
      icon: Ban,
    });
  }

  if (policy?.outcome === "auto-approve") {
    hints.push({
      field: "Status",
      message: `Within policy${claim.ocrSource === "unavailable" ? ", but the receipt did not scan — verify the typed fields against the image" : " and the receipt read cleanly — a quick verify is all it needs"}.`,
      tone: "success",
      icon: ShieldCheck,
    });
  }

  return hints;
}

const HINT_TONE_CLASSES = {
  warning: "border-l-warning bg-warning-bg/60 text-warning-text",
  danger: "border-l-danger bg-danger-bg/60 text-danger-text",
  success: "border-l-success bg-success-bg/60 text-success-text",
};

export default function ClaimDetailModal({ open, claim, history = [], onClose }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const policy = useMemo(() => {
    if (!claim) return null;
    const ctx = claimContextFromForm({
      category: claim.type,
      amount: claim.amount,
      receiptUrl: claim.receiptUrl,
      expenseDate: claim.date,
      details: claim.details || {},
    });
    return evaluatePolicies(ctx);
  }, [claim]);

  const categorySpec = claim ? categoryFields[claim.type] : null;
  const detailEntries =
    claim?.details && categorySpec?.fields
      ? categorySpec.fields
          .map((f) => ({ label: f.label, value: claim.details[f.key] }))
          .filter((e) => e.value !== undefined && e.value !== null && e.value !== "")
      : [];

  const hints = useMemo(
    () => (claim ? buildFieldHints(claim, policy) : []),
    [claim, policy],
  );

  if (!open || !claim) return null;

  const statusKey = STATUS_KEYS[claim.status] || "pending";
  const PolicyIcon = policy ? POLICY_ICON[policy.outcome] : null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-sheet modal-sheet-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-detail-header">
          <div className="modal-detail-header-text">
            <h3 className="modal-title">{claim.id}</h3>
            <p className="modal-subtitle">
              {claim.employee} · {claim.department}
            </p>
          </div>
          <span className={`badge-custom badge-${statusKey}`}>
            {claim.status}
          </span>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="modal-detail-body">
          {policy && (
            <div className={`preflight preflight-${policy.outcome}`} role="status">
              <div className="preflight-icon">
                {PolicyIcon && <PolicyIcon className="h-4 w-4" />}
              </div>
              <div className="preflight-body">
                <div className="preflight-headline">
                  <strong>{POLICY_LABEL[policy.outcome]}</strong>
                  {policy.label && (
                    <span className="preflight-rule">{policy.label}</span>
                  )}
                </div>
                <p className="preflight-message">{policy.message}</p>
              </div>
            </div>
          )}

          {hints.length > 0 && (
            <div className="rounded-ds-md border border-border-subtle bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-1.5 bg-subtle/40">
                <Eye className="h-3 w-3 text-text-tertiary" />
                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-text-tertiary">
                  Where to look
                </span>
              </div>
              <ul className="flex flex-col">
                {hints.map((hint, idx) => {
                  const Icon = hint.icon;
                  return (
                    <li
                      key={idx}
                      className={`border-l-2 px-3 py-2.5 text-[12px] leading-snug ${HINT_TONE_CLASSES[hint.tone]}`}
                    >
                      <div className="flex items-start gap-1.5">
                        <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-text-primary mb-0.5">
                            {hint.field}
                          </div>
                          <p className="text-text-secondary">{hint.message}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="claim-detail-receipt">
            <div className="claim-detail-receipt-thumb">
              <ScanLine className="h-6 w-6" />
              <span>
                {claim.receiptUrl ? "Receipt attached" : "No receipt"}
              </span>
              <small>
                {claim.receiptUrl
                  ? claim.ocrSource === "azure"
                    ? "Azure OCR · structured fields"
                    : claim.ocrSource === "unavailable"
                    ? "Stored, OCR unavailable"
                    : "Click to view full image"
                  : "Manual entry"}
              </small>
            </div>
          </div>

          <div className="claim-detail-meta">
            <div className="claim-detail-meta-item">
              <span className="claim-detail-meta-label">Amount</span>
              <span className="claim-detail-meta-value">
                {formatSGD(claim.amount)}
              </span>
            </div>
            <div className="claim-detail-meta-item">
              <span className="claim-detail-meta-label">Category</span>
              <span className="claim-detail-meta-value">{claim.type}</span>
            </div>
            <div className="claim-detail-meta-item">
              <span className="claim-detail-meta-label">Date</span>
              <span className="claim-detail-meta-value">
                {formatSGDate(claim.date)}
              </span>
            </div>
            {claim.merchant && (
              <div className="claim-detail-meta-item">
                <span className="claim-detail-meta-label">Merchant</span>
                <span className="claim-detail-meta-value">{claim.merchant}</span>
              </div>
            )}
            {claim.gstAmount != null && (
              <div className="claim-detail-meta-item">
                <span className="claim-detail-meta-label">GST</span>
                <span className="claim-detail-meta-value">
                  {formatSGD(claim.gstAmount)}
                </span>
              </div>
            )}
          </div>

          {detailEntries.length > 0 && (
            <div className="rounded-ds-md border border-border-subtle bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border-subtle bg-subtle/40">
                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-text-tertiary">
                  {categorySpec?.label || claim.type} details
                </span>
              </div>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 p-3">
                {detailEntries.map((entry, idx) => (
                  <div key={idx} className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-[0.06em] text-text-tertiary font-medium mb-0.5">
                      {entry.label}
                    </dt>
                    <dd className="text-[13px] text-text-primary leading-snug whitespace-pre-wrap break-words">
                      {String(entry.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="claim-detail-history">
            <h4 className="claim-detail-history-title flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-text-tertiary" />
              Activity
            </h4>
            {history.length === 0 ? (
              <p className="form-hint">No activity recorded yet.</p>
            ) : (
              <ol className="timeline">
                {history.map((entry, idx) => {
                  const dotKey = STATUS_KEYS[entry.status] || "pending";
                  return (
                    <li key={idx} className="timeline-item">
                      <span className={`timeline-dot timeline-dot-${dotKey}`} />
                      <div className="timeline-content">
                        <div className="timeline-action">{entry.action}</div>
                        <div className="timeline-meta">
                          {entry.actor} · {entry.role} · {entry.date}{" "}
                          {entry.time}
                        </div>
                        {entry.reason && (
                          <div className="text-[12px] text-text-secondary mt-1 italic">
                            {entry.reason}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
