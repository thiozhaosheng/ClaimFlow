import { useState, useEffect } from "react";
import { formatSGD } from "../utils/helpers.js";

const CATEGORY_OPTIONS = [
  "Transport",
  "Meal",
  "Client Entertainment",
  "Office Supplies",
  "Travel",
  "Training",
  "Medical (statutory)",
];

export default function EditClaimModal({ open, claim, onSave, onCancel }) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !claim) return;
    setCategory(claim.type || "");
    setAmount(claim.amount != null ? String(claim.amount) : "");
    setGstAmount(claim.gstAmount != null ? String(claim.gstAmount) : "");
    setMerchant(claim.merchant || "");
    setDate(claim.date || "");
  }, [open, claim]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open || !claim) return null;

  const handleSave = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSave({
        category,
        amount,
        gstAmount,
        merchant,
        expenseDate: date,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Edit claim</h3>
          <p className="modal-subtitle">
            {claim.id} · originally {formatSGD(claim.amount)} · {claim.date}
          </p>
        </div>
        <div className="modal-body">
          <div className="form-group-modern">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group-modern">
            <label className="form-label">Merchant</label>
            <input
              type="text"
              className="form-control"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group-modern">
              <label className="form-label">Expense date</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="form-group-modern">
              <label className="form-label">Total (S$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group-modern">
            <label className="form-label">GST (S$) — optional</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-control"
              value={gstAmount}
              onChange={(e) => setGstAmount(e.target.value)}
            />
          </div>
          <p className="form-hint">
            The receipt stays attached. If the receipt itself is wrong, withdraw the
            claim and submit again.
          </p>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary-modern"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={submitting || !category || !amount || !date}
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
