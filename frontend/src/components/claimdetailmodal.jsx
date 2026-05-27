import { useEffect, useMemo } from "react";
import { ShieldCheck, AlertTriangle, Ban } from "lucide-react";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import {
  evaluatePolicies,
  claimContextFromForm,
} from "../lib/policy.js";

const STATUS_KEYS = {
  Pending: "pending",
  Endorsed: "endorsed",
  Paid: "paid",
  Rejected: "rejected",
};

const POLICY_LABEL = {
  "auto-approve": "Met every auto-approval check",
  "route-to-human": "Flagged for your review",
  block: "Blocked at submission by policy",
};

const POLICY_ICON = {
  "auto-approve": ShieldCheck,
  "route-to-human": AlertTriangle,
  block: Ban,
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
    });
    return evaluatePolicies(ctx);
  }, [claim]);

  if (!open || !claim) return null;

  const statusKey = STATUS_KEYS[claim.status] || "pending";
  const PolicyIcon = policy ? POLICY_ICON[policy.outcome] : null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
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
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-detail-body">
          {/* policy hint — shown to anyone opening the claim */}
          {policy && (
            <div className={`preflight preflight-${policy.outcome}`} role="status">
              <div className="preflight-icon">
                {PolicyIcon && <PolicyIcon className="h-4 w-4" />}
              </div>
              <div className="preflight-body">
                <div className="preflight-headline">
                  <strong>{POLICY_LABEL[policy.outcome]}</strong>
                  <span className="preflight-rule">{policy.ruleId}</span>
                </div>
                <p className="preflight-message">{policy.message}</p>
              </div>
            </div>
          )}

          <div className="claim-detail-receipt">
            <div className="claim-detail-receipt-thumb">
              <i className="fa-regular fa-image"></i>
              <span>Receipt attached</span>
              <small>Click to view full image</small>
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
            <div className="claim-detail-meta-item">
              <span className="claim-detail-meta-label">Bank account</span>
              <span className="claim-detail-meta-value">{claim.bank}</span>
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

          <div className="claim-detail-history">
            <h4 className="claim-detail-history-title">Activity</h4>
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
