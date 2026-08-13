import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  AlertTriangle,
  Ban,
  CircleDashed,
  FileText,
} from "lucide-react";
import { useClaims } from "../hooks/useclaims.js";
import { useReceipt } from "../hooks/usereceipt.js";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";
import {
  deriveStages,
  deriveRequirements,
} from "../lib/claimProgress.js";
import categoryFields from "../data/categoryFields.json";
import EditClaimModal, { correctionRequestOf } from "../components/editclaimmodal.jsx";
import ConfirmModal from "../components/confirmmodal.jsx";

const STATUS_KEY = {
  Pending: "pending",
  Endorsed: "endorsed",
  Paid: "paid",
  Rejected: "rejected",
};

// Requirement state → glyph. Tone carries MEANING and nothing else: a satisfied
// check is stated in plain ink, because a column of green ticks is decoration
// that makes the two rows which need attention harder to find.
const REQ_PRESENTATION = {
  done: { icon: Check, tone: "done" },
  missing: { icon: AlertTriangle, tone: "warn" },
  blocked: { icon: Ban, tone: "block" },
  review: { icon: Clock, tone: "info" },
  optional: { icon: CircleDashed, tone: "muted" },
};

function StageTracker({ stages }) {
  return (
    <ol className="stage-tracker" aria-label="Claim progress">
      {stages.map((s, i) => (
        <li key={s.key} className={`stage-node stage-${s.state}`}>
          <span className="stage-dot">
            {s.state === "done" ? (
              <Check className="h-3 w-3" />
            ) : s.state === "rejected" ? (
              <Ban className="h-3 w-3" />
            ) : s.state === "current" ? (
              <Clock className="h-3 w-3" />
            ) : (
              <span className="stage-num">{i + 1}</span>
            )}
          </span>
          <span className="stage-label">{s.label}</span>
          {i < stages.length - 1 && <span className="stage-line" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
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

  const stages = useMemo(() => (claim ? deriveStages(claim) : []), [claim]);
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

  // What the person looking at this claim can actually do with it. The page
  // used to offer nothing at all — you could open your own pending claim,
  // read it, and go back to the list to act on it. The list's own row has had
  // Edit and Withdraw the whole time.
  const isOwner = session?.role === "employee";
  const isOpen = claim.status === "Pending" && !claim.withdrawn;
  const canAct = isOwner && isOpen;
  // An approver reading a claim that is waiting on them needs the same way out
  // as the submitter does. The decision itself stays in the gated review flow
  // on the queue — this opens it against this claim rather than duplicating it.
  const canReview = session?.role === "approving" && isOpen && !correctionRequestOf(claim);
  const correction = correctionRequestOf(claim);

  // The arithmetic an expense record is supposed to show. Prices here are
  // GST-inclusive, which is how they are printed on a Singapore receipt, so
  // the net is what remains after the tax — and the net is the figure that
  // reaches the accounts. The page used to show the total alone and drop GST
  // into the middle of a list of facts, where it read as a detail rather than
  // as part of a sum.
  const gst = claim.gstAmount != null ? Number(claim.gstAmount) : null;
  const net = gst != null ? Number(claim.amount) - gst : null;

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
        <div className="claim-detail-ident">
          <h1 className="claim-detail-ref">{claim.id}</h1>
          <span className={`badge-custom badge-${statusKey}`}>{claim.status}</span>
        </div>
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

      <div className="claim-detail-grid">
        <div className="data-panel claim-detail-record">
            <div className="data-panel-head">
              <h2 className="data-panel-title">Claim</h2>
            </div>
            <dl className="record-grid">
              <RecordRow label="Claimant" value={claim.employee} />
              <RecordRow label="Department" value={claim.department} />
              <RecordRow label="Category" value={claim.type} />
              <RecordRow label="Merchant" value={claim.merchant || "Not recorded"} />
              <RecordRow label="Expense date" value={formatSGDate(claim.date)} />
              <RecordRow
                label="Receipt scan"
                value={
                  claim.ocrSource === "azure"
                    ? "Read automatically"
                    : claim.ocrSource === "unavailable"
                      ? "Typed by hand"
                      : "Not recorded"
                }
              />
              {detailEntries.map((e, i) => (
                <RecordRow key={i} label={e.label} value={String(e.value)} />
              ))}
            </dl>

            {/* Net, tax, total — right-aligned and tabular, the way a claim is
                actually settled. */}
            <table className="amount-ledger">
              <tbody>
                {net != null && (
                  <>
                    <tr>
                      <th scope="row">Net of GST</th>
                      <td className="num">{formatSGD(net)}</td>
                    </tr>
                    <tr>
                      <th scope="row">GST 9%</th>
                      <td className="num">{formatSGD(gst)}</td>
                    </tr>
                  </>
                )}
                <tr className="amount-ledger-total">
                  <th scope="row">Total claimed</th>
                  <td className="num">{formatSGD(claim.amount)}</td>
                </tr>
              </tbody>
            </table>
            {net == null && (
              <p className="amount-ledger-note">
                No GST recorded — the merchant may not be GST-registered.
              </p>
            )}
        </div>

        <div className="data-panel claim-detail-receipt">
            <div className="data-panel-head">
              <h2 className="data-panel-title">Receipt</h2>
            </div>
            {claim.receiptUrl && receiptSrc && !receiptBroken ? (
              <div className="claim-receipt-view">
                <a href={receiptSrc} target="_blank" rel="noreferrer">
                  <img
                    src={receiptSrc}
                    alt={`Receipt for ${claim.id}`}
                    onError={markReceiptBroken}
                  />
                  <span>Open full size</span>
                </a>
              </div>
            ) : (
              <p className="claim-receipt-missing">
                {claim.receiptUrl
                  ? "Receipt stored, preview unavailable."
                  : "No receipt attached."}
              </p>
            )}
        </div>

        <div className="data-panel claim-detail-progress">
          <div className="data-panel-head">
            <h2 className="data-panel-title">Progress</h2>
          </div>
          <div className="claim-stage-wrap">
            <StageTracker stages={stages} />
          </div>
          {policy && (
            <p className={`claim-policy-line claim-policy-${policy.outcome}`}>
              <strong>
                {policy.outcome === "auto-approve"
                  ? "Within policy"
                  : policy.outcome === "block"
                    ? "Blocked by policy"
                    : "Routed for review"}
              </strong>
              {policy.label ? ` · ${policy.label}` : ""} — {policy.message}
            </p>
          )}
        </div>

          {/* The claim's own audit trail, in the same ledger the finance
              workspace uses. It was a stack of coloured dots and prose — the
              one screen where "who approved what, and when" has to be legible
              at a glance was the one screen not using the table. */}
        <div className="data-panel claim-detail-history">
            <div className="data-panel-head">
              <h2 className="data-panel-title">History</h2>
              <span className="data-panel-count">{history.length} entries</span>
            </div>
            {history.length === 0 ? (
              <p className="claim-empty-line">No activity recorded yet.</p>
            ) : (
              <div className="data-panel-scroll">
                <table className="data-table">
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
                        <td className="claim-history-when">
                          {entry.date}
                          <span>{entry.time}</span>
                        </td>
                        <td>{entry.action}</td>
                        <td>
                          {entry.actor}
                          <span className="claim-history-role">{entry.role}</span>
                        </td>
                        <td className="claim-history-note">{entry.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        <div className="data-panel claim-detail-checks">
            <div className="data-panel-head">
              <h2 className="data-panel-title">Checks</h2>
            </div>
            <ul className="req-list">
              {requirements.map((r) => {
                const pres = REQ_PRESENTATION[r.state] || REQ_PRESENTATION.optional;
                const Icon = pres.icon;
                return (
                  <li key={r.key} className={`req-row req-${pres.tone}`}>
                    <span className="req-icon">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="req-label">{r.label}</span>
                    {r.detail && <span className="req-detail">{r.detail}</span>}
                  </li>
                );
              })}
            </ul>
        </div>
      </div>

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

function RecordRow({ label, value }) {
  return (
    <div className="record-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
