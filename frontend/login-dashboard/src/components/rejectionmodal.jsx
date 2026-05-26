import { useState, useEffect } from "react";
import { formatSGD } from "../utils/helpers.js";

export default function RejectionModal({ open, claim, onConfirm, onCancel }) {
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

  if (!open || !claim) return null;

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Reject claim</h3>
          <p className="modal-subtitle">
            {claim.id} · {claim.employee} · {formatSGD(claim.amount)}
          </p>
        </div>
        <div className="modal-body">
          <label htmlFor="rejection-reason" className="form-label">
            Reason for rejection
          </label>
          <textarea
            id="rejection-reason"
            className="form-control"
            rows="4"
            placeholder="Explain why this claim is being rejected so the claimant has clear context."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <p className="form-hint">
            The claimant will see this reason in their claim history.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary-modern" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger-modern"
            disabled={!reason.trim()}
            onClick={handleConfirm}
          >
            Reject claim
          </button>
        </div>
      </div>
    </div>
  );
}
