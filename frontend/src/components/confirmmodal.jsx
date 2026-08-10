import { useEffect, useRef } from "react";

/**
 * Confirmation dialog for actions that cannot be undone.
 *
 * Replaces window.confirm() for destructive actions. The native dialog cannot
 * be styled at all: its confirm button is whatever the browser paints, which on
 * every major browser is the same neutral or primary blue used for ordinary
 * actions. That puts "Withdraw this claim" one identically-coloured button away
 * from "OK, save" — the colour carries no warning, so the only thing standing
 * between the user and an irreversible action is reading the sentence.
 *
 * Here the confirming button is red whenever `destructive` is set, and Cancel
 * is the visually quieter of the two, so the dangerous path is the one that
 * looks dangerous.
 *
 * Colour is not doing the work alone — it never should, since red and grey are
 * the most common pair to collapse under deuteranopia. The button also carries
 * an explicit verb ("Withdraw claim", not "OK"), so the action is legible
 * without perceiving the hue at all.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = e => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  // Focus Cancel rather than the confirming button. For a destructive dialog
  // the safe option should be the one a stray Enter press lands on.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby={message ? "confirm-modal-message" : undefined}
    >
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: "420px" }}>
        <div className="modal-header">
          <h3 className="modal-title" id="confirm-modal-title">
            {title}
          </h3>
        </div>
        {message && (
          <div className="modal-body">
            <p className="form-hint" id="confirm-modal-message" style={{ margin: 0 }}>
              {message}
            </p>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} ref={cancelRef}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
