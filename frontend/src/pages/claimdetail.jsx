import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { useClaims } from "../hooks/useclaims.js";
import { useReceipt } from "../hooks/usereceipt.js";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";
import { deriveRequirements } from "../lib/claimProgress.js";
import categoryFields from "../data/categoryFields.json";
import EditClaimModal, { correctionRequestOf } from "../components/editclaimmodal.jsx";
import ConfirmModal from "../components/confirmmodal.jsx";
import "./claim-record.css";

const STATUS_KEY = {
  Pending: "pending",
  Endorsed: "endorsed",
  Paid: "paid",
  Rejected: "rejected",
};

/**
 * Where the claim stands, in a sentence.
 *
 * This was a three-node stepper: circles, a connecting line, a numbered node
 * for the step not reached yet. It is the component every generated dashboard
 * ships, and it told the reader less than one line of text can — while saying
 * the same thing the history table underneath already records, in less detail.
 */
function standing(claim) {
  if (claim.withdrawn) return "Withdrawn by the submitter, and in no queue.";
  switch (claim.status) {
    case "Pending":
      return "With the approving officer. Nothing is owed until it is endorsed.";
    case "Endorsed":
      return "Endorsed. Waiting on finance to release the payment.";
    case "Paid":
      return "Paid by GIRO or PayNow to the claimant's account.";
    case "Rejected":
      return "Rejected. A new claim has to be submitted to try again.";
    default:
      return claim.status;
  }
}

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { latestMap, claimsDb, editClaim, withdrawClaim } = useClaims();
  const { session } = useAuth();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const claim = latestMap[id];
  const {
    src: receiptSrc,
    broken: receiptBroken,
    markBroken: markReceiptBroken,
  } = useReceipt(claim);

  const history = useMemo(
    () => (claim ? claimsDb.filter((log) => log.id === claim.id) : []),
    [claim, claimsDb],
  );

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

  const requirements = useMemo(
    () => (claim ? deriveRequirements(claim) : []),
    [claim],
  );

  const categorySpec = claim ? categoryFields[claim.type] : null;
  const detailEntries =
    claim?.details && categorySpec?.fields
      ? categorySpec.fields
          .map((f) => ({ label: f.label, value: claim.details[f.key] }))
          .filter((e) => e.value !== undefined && e.value !== null && e.value !== "")
      : [];

  if (!claim) {
    return (
      <section className="role-workspace">
        <div className="workspace-card p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
          <h2 className="text-lg font-semibold mb-1">Claim not found</h2>
          <p className="text-sm text-text-secondary mb-4">
            We couldn't find claim <code>{id}</code> in your view.
          </p>
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </section>
    );
  }

  const statusKey = STATUS_KEY[claim.status] || "pending";
  const isOwner = session?.role === "employee";
  const isOpen = claim.status === "Pending" && !claim.withdrawn;
  const correction = correctionRequestOf(claim);
  const canAct = isOwner && isOpen;
  const canReview = session?.role === "approving" && isOpen && !correction;

  // Prices are GST-inclusive, as printed on a Singapore receipt, so the net is
  // what remains after the tax — and the net is the figure that reaches the
  // accounts.
  const gst = claim.gstAmount != null ? Number(claim.gstAmount) : null;
  const net = gst != null ? Number(claim.amount) - gst : null;

  const outstanding = requirements.filter(
    (r) => r.state === "missing" || r.state === "blocked",
  );

  return (
    <section className="role-workspace claim-detail">
      <div className="claim-detail-topbar">
        <button
          className="claim-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Back to claims"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        {canAct && (
          <div className="claim-detail-actions">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              {correction ? "Fix and resend" : "Edit claim"}
            </button>
            <button className="btn-secondary" onClick={() => setWithdrawing(true)}>
              Withdraw
            </button>
          </div>
        )}
        {canReview && (
          <div className="claim-detail-actions">
            <button
              className="btn-primary"
              onClick={() => navigate(`/approving?review=${claim.id}`)}
            >
              Review claim
            </button>
          </div>
        )}
      </div>

      {correction && (
        <div className="claim-correction-bar" role="status">
          <strong>{correction.requestedBy}</strong> asked for{" "}
          {correction.labels.join(", ")} to be corrected
          {correction.note ? <> — “{correction.note}”</> : null}
        </div>
      )}

      <article className="claim-sheet">
        <header className="claim-sheet-head">
          <div className="min-w-0">
            <div className="claim-sheet-ref">
              <h1>{claim.id}</h1>
              <span className={`badge-custom badge-${statusKey}`}>
                {claim.withdrawn ? "Withdrawn" : claim.status}
              </span>
            </div>
            <p className="claim-sheet-line">
              {claim.type} · {claim.merchant || "Merchant not recorded"} ·{" "}
              {formatSGDate(claim.date)}
            </p>
            <p className="claim-sheet-line">Submitted by {claim.employee}</p>
          </div>
          <div className="claim-sheet-amount">
            <b>{formatSGD(claim.amount)}</b>
            <span>
              {gst != null ? `incl. GST 9% ${formatSGD(gst)}` : "no GST recorded"}
            </span>
          </div>
        </header>

        <div className="claim-section">
          <div className="claim-section-label">Expense</div>
          <div className="claim-expense">
            <div className="min-w-0">
              {/* Category, merchant and date are in the masthead two inches
                  above. Repeating them here is the same words twice on one
                  screen — what is left is what the masthead does not say. */}
              <dl className="claim-facts">
                <Fact
                  label="Fields"
                  value={
                    claim.ocrSource === "azure"
                      ? "Read off the receipt"
                      : claim.ocrSource === "unavailable"
                        ? "Typed by hand"
                        : "Not recorded"
                  }
                />
                <Fact label="Department" value={claim.department || "Not recorded"} />
                {detailEntries.map((e, i) => (
                  <Fact key={i} label={e.label} value={String(e.value)} />
                ))}
              </dl>

              <table className="claim-sum">
                <tbody>
                  {net != null && (
                    <>
                      <tr>
                        <th scope="row">Net of GST</th>
                        <td>{formatSGD(net)}</td>
                      </tr>
                      <tr>
                        <th scope="row">GST 9%</th>
                        <td>{formatSGD(gst)}</td>
                      </tr>
                    </>
                  )}
                  <tr className="claim-sum-total">
                    <th scope="row">Total claimed</th>
                    <td>{formatSGD(claim.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <figure className="claim-plate">
              {claim.receiptUrl && receiptSrc && !receiptBroken ? (
                <>
                  <a href={receiptSrc} target="_blank" rel="noreferrer">
                    <img
                      src={receiptSrc}
                      alt={`Receipt for ${claim.id}`}
                      onError={markReceiptBroken}
                    />
                  </a>
                  <figcaption>Receipt as submitted · open full size</figcaption>
                </>
              ) : (
                <div className="claim-plate-empty">
                  {claim.receiptUrl
                    ? "Receipt stored, preview unavailable."
                    : "No receipt attached."}
                </div>
              )}
            </figure>
          </div>
        </div>

        <div className="claim-section">
          <div className="claim-section-label">Approval</div>
          <p className="claim-standing">
            {standing(claim)}{" "}
            {policy && (
              <em className={`claim-standing-${policy.outcome}`}>
                {policy.label ? `${policy.label} — ` : ""}
                {policy.message}
              </em>
            )}
          </p>

          {history.length === 0 ? (
            <p className="claim-standing">
              <em>Nothing has happened to this claim yet.</em>
            </p>
          ) : (
            <table className="claim-trail">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>By</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => (
                  <tr key={i}>
                    <td className="claim-trail-when">
                      {entry.date}
                      <span className="claim-trail-sub">{entry.time}</span>
                    </td>
                    <td>{entry.action}</td>
                    <td>
                      {entry.actor}
                      <span className="claim-trail-sub">{entry.role}</span>
                    </td>
                    <td className="claim-trail-note">{entry.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="claim-section">
          <div className="claim-section-label">
            {outstanding.length > 0 ? "Outstanding" : "Checks"}
          </div>
          <div className="claim-checks">
            {requirements.map((r) => (
              <span
                key={r.key}
                className={
                  r.state === "missing"
                    ? "claim-check claim-check-warn"
                    : r.state === "blocked"
                      ? "claim-check claim-check-block"
                      : "claim-check"
                }
              >
                {r.label}
                {r.detail ? <em>{r.detail}</em> : null}
              </span>
            ))}
          </div>
        </div>
      </article>

      <EditClaimModal
        open={editing}
        claim={claim}
        onCancel={() => setEditing(false)}
        onSave={async (updates) => {
          try {
            await editClaim(claim.id, updates);
            addToast(
              correction
                ? {
                    variant: "success",
                    title: "Sent back for approval",
                    message: `${claim.id} is back with ${correction.requestedBy}, who will re-check ${correction.labels.join(", ")}.`,
                  }
                : {
                    variant: "success",
                    title: "Claim updated",
                    message: `${claim.id} saved — still pending review.`,
                  },
            );
            setEditing(false);
          } catch (e) {
            addToast({
              variant: "error",
              title: "Couldn't save the change",
              message: e.message,
            });
          }
        }}
      />

      <ConfirmModal
        open={withdrawing}
        title="Withdraw this claim?"
        message="It won't be visible to approvers any more, but stays archived in case of disputes."
        confirmLabel="Withdraw claim"
        cancelLabel="Keep claim"
        destructive
        onCancel={() => setWithdrawing(false)}
        onConfirm={async () => {
          setWithdrawing(false);
          try {
            await withdrawClaim(claim.id);
            addToast({
              variant: "success",
              title: "Claim withdrawn",
              message: `${claim.id} has been withdrawn from review.`,
            });
          } catch (e) {
            addToast({
              variant: "error",
              title: "Couldn't withdraw",
              message: e.message,
            });
          }
        }}
      />
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="claim-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
