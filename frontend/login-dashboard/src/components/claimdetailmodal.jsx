import { useEffect } from "react";

const STATUS_KEYS = {
  Pending: "pending",
  Endorsed: "endorsed",
  Paid: "paid",
  Rejected: "rejected",
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

  if (!open || !claim) return null;

  const statusKey = STATUS_KEYS[claim.status] || "pending";

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
                ${claim.amount.toFixed(2)}
              </span>
            </div>
            <div className="claim-detail-meta-item">
              <span className="claim-detail-meta-label">Category</span>
              <span className="claim-detail-meta-value">{claim.type}</span>
            </div>
            <div className="claim-detail-meta-item">
              <span className="claim-detail-meta-label">Date</span>
              <span className="claim-detail-meta-value">{claim.date}</span>
            </div>
            <div className="claim-detail-meta-item">
              <span className="claim-detail-meta-label">Bank account</span>
              <span className="claim-detail-meta-value">{claim.bank}</span>
            </div>
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
