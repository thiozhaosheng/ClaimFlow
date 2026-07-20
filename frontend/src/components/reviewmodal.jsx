import { useState, useEffect } from "react";
import { formatSGD } from "../utils/helpers.js";

export default function ReviewModal({ open, claim, actionType, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open || !claim || !actionType) return null;

  const isReject = actionType === "reject";

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(actionType, reason.trim());
  };

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isReject ? "Reject claim" : "Endorse claim"}</h3>
          <p className="modal-subtitle">
            {claim.id} · {claim.employee} · {formatSGD(claim.amount)}
          </p>
        </div>
        <div className="modal-body">
          <label htmlFor="review-reason" className="form-label">
            {isReject ? "Reason for rejection" : "Endorsement remarks"}
          </label>
          <textarea
            id="review-reason"
            className="form-control"
            rows="4"
            placeholder={
              isReject
                ? "Explain why this claim is being rejected so the claimant has clear context."
                : "Provide a justification or remark for endorsing this claim (required)."
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <p className="form-hint">
            This will be permanently recorded in the audit trail.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={isReject ? "btn-danger" : "btn-primary"}
            disabled={!reason.trim()}
            onClick={handleConfirm}
            style={!isReject ? { backgroundColor: 'var(--color-accent)', color: 'white' } : {}}
          >
            {isReject ? "Reject claim" : "Endorse claim"}
          </button>
        </div>
      </div>
    </div>
  );
}
