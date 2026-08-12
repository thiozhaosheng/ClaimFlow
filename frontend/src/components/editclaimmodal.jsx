import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
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

// The field keys an approver can send back, with the labels the submitter
// already sees on the form. Shared with the employee page so the card, the
// modal and the toast all name a field the same way — the whole point of the
// correction loop is that nobody has to ask "which amount?".
export const CORRECTION_FIELD_LABELS = {
  merchant: "Merchant",
  expenseDate: "Expense date",
  amount: "Amount",
  gstAmount: "GST",
  category: "Category",
  receipt: "Receipt image",
};

// Form order, so a request for {gstAmount, merchant} always reads
// "Merchant, GST" rather than echoing whatever order the approver clicked in.
const FIELD_ORDER = [
  "merchant",
  "expenseDate",
  "category",
  "amount",
  "gstAmount",
  "receipt",
];

/**
 * The open correction request on a claim, or null when there is none.
 *
 * The backend stores it at `claim.details.correctionRequest` and deletes it
 * the moment an edit is saved, so the presence of this object is the single
 * source of truth for "this claim is waiting on me".
 */
export function correctionRequestOf(claim) {
  const request = claim?.details?.correctionRequest;
  if (!request) return null;
  // A request to fix something only stands while the claim is still open. The
  // record of it stays on the claim after a decision, which is right for the
  // audit trail and wrong for the queue: a rejected claim was showing
  // "Correction requested" and a Fix and resend button, so the submitter was
  // invited to redo work for an approver who had already closed it. It also
  // put the count out — the sidebar said one claim needed fixing while the
  // banner above it named two.
  if (claim.withdrawn) return null;
  if (claim.status && claim.status !== "Pending") return null;
  const raw = Array.isArray(request.fields) ? request.fields : [];
  if (raw.length === 0) return null;
  const known = FIELD_ORDER.filter((key) => raw.includes(key));
  const unknown = raw.filter((key) => !FIELD_ORDER.includes(key));
  const fields = [...known, ...unknown];
  return {
    fields,
    labels: fields.map((key) => CORRECTION_FIELD_LABELS[key] ?? key),
    note: typeof request.note === "string" ? request.note.trim() : "",
    requestedBy: request.requestedBy || "Your approving officer",
    requestedAt: request.requestedAt || null,
  };
}

// Marks a field the approver named, so the annotation survives when the
// warning colour is not perceived.
function AskedTag() {
  return <span className="fix-field-tag">Correct this</span>;
}

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

  // When an approver has sent the claim back, the named fields are the whole
  // job: they get the warning treatment and a tag, everything else stays
  // ordinary so the eye goes straight to the work.
  const correction = correctionRequestOf(claim);
  const asked = new Set(correction?.fields || []);
  const askedClass = (key) =>
    `form-group-modern${asked.has(key) ? " field-asked" : ""}`;

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
          <h3 className="modal-title">
            {correction ? "Correct this claim" : "Edit claim"}
          </h3>
          <p className="modal-subtitle">
            {claim.id} · originally {formatSGD(claim.amount)} · {claim.date}
          </p>
        </div>
        <div className="modal-body">
          {correction && (
            <div className="fix-callout">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="fix-callout-text">
                <span className="fix-who">{correction.requestedBy}</span> asked
                for: {correction.labels.join(", ")}
                {correction.note ? ` — ${correction.note}` : ""}
              </p>
            </div>
          )}
          <div className={askedClass("category")}>
            <label className="form-label">
              Category
              {asked.has("category") && <AskedTag />}
            </label>
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
          <div className={askedClass("merchant")}>
            <label className="form-label">
              Merchant
              {asked.has("merchant") && <AskedTag />}
            </label>
            <input
              type="text"
              className="form-control"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={askedClass("expenseDate")}>
              <label className="form-label">
                Expense date
                {asked.has("expenseDate") && <AskedTag />}
              </label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className={askedClass("amount")}>
              <label className="form-label">
                Total (S$)
                {asked.has("amount") && <AskedTag />}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className={askedClass("gstAmount")}>
            <label className="form-label">
              GST (S$) — optional
              {asked.has("gstAmount") && <AskedTag />}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="form-control"
              value={gstAmount}
              onChange={(e) => setGstAmount(e.target.value)}
            />
          </div>
          {asked.has("receipt") ? (
            <p className="form-hint fix-hint">
              The receipt image itself was queried, and it cannot be replaced
              here. Withdraw this claim and submit again with the right receipt.
            </p>
          ) : (
            <p className="form-hint">
              {correction
                ? "The receipt stays attached, and your claim keeps its number and its place in the queue."
                : "The receipt stays attached. If the receipt itself is wrong, withdraw the claim and submit again."}
            </p>
          )}
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
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
            {correction
              ? submitting
                ? "Sending…"
                : "Save and send back"
              : submitting
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
