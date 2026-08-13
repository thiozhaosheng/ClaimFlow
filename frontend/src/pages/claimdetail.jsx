import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Printer } from "lucide-react";
import { useClaims, adaptClaim } from "../hooks/useclaims.js";
import { api } from "../utils/api.js";
import { useActivity } from "../hooks/useactivity.js";
import { useReceipt } from "../hooks/usereceipt.js";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";
import { deriveRequirements } from "../lib/claimProgress.js";
import categoryFields from "../data/categoryFields.json";
import { isTypingTarget } from "../hooks/useShortcuts.js";
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
function standing(claim, correction) {
  if (claim.withdrawn) return "Withdrawn by the submitter, and in no queue.";
  switch (claim.status) {
    case "Pending":
      // A claim sent back is not sitting with the approver — it is sitting with
      // the submitter, and the queue already says "Waiting on Rachel". Saying
      // "with the approving officer" here put the two screens at odds about
      // whose move it is.
      if (correction) {
        return `Sent back to ${claim.employee} to correct ${correction.labels.join(", ").toLowerCase()}. It returns to ${correction.requestedBy} once that is saved.`;
      }
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
  const { latestMap, editClaim, withdrawClaim } = useClaims();
  const { session } = useAuth();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // A claim the current list does not hold — a withdrawn one, or a deep link
  // to something outside the open filter — is fetched on its own rather than
  // rendering "Claim not found". GET /api/claims/:id enforces the same access
  // rule the list does (an employee only ever gets their own), so this widens
  // what can be OPENED, not what can be seen. Finance's audit trail is what
  // made this necessary: its rows now open the claim record, and every one of
  // them for a withdrawn claim pointed at a page that said the claim did not
  // exist while the row above it proved otherwise.
  const [fetched, setFetched] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const listed = latestMap[id];
  const claim = listed || fetched;

  const numericId = useMemo(() => {
    const m = /(\d+)\s*$/.exec(String(id || ""));
    return m ? Number(m[1]) : null;
  }, [id]);

  useEffect(() => {
    if (listed || numericId === null) return undefined;
    let cancelled = false;
    setFetchFailed(false);
    api
      .get(`/api/claims/${numericId}`)
      .then((res) => {
        if (!cancelled) setFetched(adaptClaim(res?.data?.claim));
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [listed, numericId]);
  const {
    src: receiptSrc,
    broken: receiptBroken,
    markBroken: markReceiptBroken,
  } = useReceipt(claim);

  // The claims either side of this one, in the order the lists show them —
  // newest first. Reviewing means working through a set, and going back to the
  // queue and clicking the next row costs two navigations and the loss of your
  // place every single time.
  const ordered = useMemo(
    () =>
      Object.values(latestMap)
        .filter((c) => !c.withdrawn)
        .sort((a, b) => b.rawId - a.rawId),
    [latestMap],
  );
  const position = ordered.findIndex((c) => c.id === id);
  const previous = position > 0 ? ordered[position - 1] : null;
  const next =
    position >= 0 && position < ordered.length - 1 ? ordered[position + 1] : null;

  // The real trail, from the endpoint that holds it. This used to be
  // `claimsDb.filter(log => log.id === claim.id)` — the claim list filtered
  // down to this claim — so the table showed exactly one row, reading
  // "Claim submitted", built from the claim itself. Every endorsement,
  // correction and payout was missing from the record that exists to show them.
  const {
    entries: history,
    loading: historyLoading,
    failed: historyFailed,
    refresh: refreshHistory,
  } = useActivity(claim?.rawId ?? null);

  const policy = useMemo(() => {
    if (!claim) return null;
    return evaluatePolicies(
      claimContextFromForm({
        category: claim.type,
        amount: claim.amount,
        receiptUrl: claim.receiptUrl,
        expenseDate: claim.date,
        details: claim.details || {},
        supplierGstRegNumber: claim.supplierGstRegNumber ?? null,
      }),
    );
  }, [claim]);

  const requirements = useMemo(
    () => (claim ? deriveRequirements(claim) : []),
    [claim],
  );

  // Left and right step through the set. Guarded against firing while a field
  // has focus or a dialog is open, which is what makes single-key shortcuts
  // safe to have at all.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (document.querySelector(".modal-backdrop")) return;
      if (e.key === "ArrowLeft" && previous) {
        e.preventDefault();
        navigate(`/claim/${previous.id}`);
      } else if (e.key === "ArrowRight" && next) {
        e.preventDefault();
        navigate(`/claim/${next.id}`);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previous, next, navigate]);

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
          <h2 className="text-lg font-semibold mb-1">
            {fetchFailed ? "Claim not found" : "Opening claim…"}
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            {fetchFailed
              ? `${id} is not a claim you can open.`
              : `Fetching ${id}.`}
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

  // Five years from the end of the financial year of the transaction, which is
  // the retention the privacy notice and docs/compliance/retention-policy.md
  // both state. Printed because it is one of the things a chat thread cannot
  // tell you about a photo.
  const retainedUntil = claim.date
    ? `${new Date(claim.date).getFullYear() + 5}`
    : "—";

  const stamp = (value) =>
    value
      ? `${formatSGDate(value)} · ${new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}`
      : "Not recorded";
  const submittedOn = stamp(claim.createdAt);
  // The last thing that HAPPENED to this claim, which is the newest audit
  // entry — not `updatedAt`, a column Prisma rewrites on every write including
  // ones that change nothing a reader would call an update. The two disagreeing
  // on the same sheet is the kind of thing that makes a record untrustworthy.
  const lastEvent = history.length > 0 ? history[0] : null;
  const updatedOn = lastEvent
    ? `${lastEvent.date} · ${lastEvent.time}`
    : stamp(claim.updatedAt);
  // IRAS allows a simplified tax invoice up to S$1,000; above it finance needs
  // the supplier's GST registration number and the invoice serial to claim the
  // input tax. Neither is captured anywhere in this product yet, so the record
  // says so rather than leaving a blank.
  const needsTaxInvoice =
    Number(claim.amount) > 1000 &&
    !(claim.supplierGstRegNumber && claim.taxInvoiceNumber);

  // Mirrors the API's own suppression rule (claim.controller.ts): a rule match
  // becomes a recommendation only when the receipt read cleanly.
  const recommendationWithheld =
    policy?.outcome === "auto-approve" &&
    (claim.ocrSource === "unavailable" || claim.details?.ocrIncomplete === true);

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
        {position >= 0 && ordered.length > 1 && (
          <nav className="claim-pager" aria-label="Move between claims">
            <button
              type="button"
              onClick={() => previous && navigate(`/claim/${previous.id}`)}
              disabled={!previous}
              title="Previous claim (left arrow)"
              aria-label="Previous claim"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              {position + 1} of {ordered.length}
            </span>
            <button
              type="button"
              onClick={() => next && navigate(`/claim/${next.id}`)}
              disabled={!next}
              title="Next claim (right arrow)"
              aria-label="Next claim"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        )}

        <div className="claim-detail-actions claim-detail-print">
          <button
            className="btn-secondary"
            onClick={() => window.print()}
            title="Print or save as PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
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

      <article className="claim-sheet">
        <header className="claim-sheet-head">
          <div className="min-w-0">
            <div className="claim-sheet-ref">
              <h1>{claim.id}</h1>
              {/* The same words the queue uses. A claim sent back reads
                  "Awaiting correction" in the approver's list and read
                  "Pending" here, so the two screens named one state twice. */}
              <span
                className={`badge-custom badge-${correction ? "awaiting" : statusKey}`}
              >
                {claim.withdrawn
                  ? "Withdrawn"
                  : correction
                    ? "Awaiting correction"
                    : claim.status}
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

        {/* The exhibit and the record, side by side. A receipt in a chat
            thread has no reference, no capture date, no link to the amount it
            supports and no retention; those four facts sit under the image
            because they are the difference this product is selling. Pinning
            the image alongside the record also lets it be a size someone can
            actually read without pushing the page past one screen. */}
        <div className="claim-body">
          <div className="claim-record-col">
            {/* Grouped so nothing has to be hunted for: who and what state,
                then what was bought, then the money and the tax on it, then
                what has happened to it, then what is outstanding. A finance
                clerk reads down one axis instead of across a page. */}
            <div className="claim-section">
              <div className="claim-section-label">Claim</div>
              <dl className="claim-facts">
                <Fact label="Reference" value={claim.id} mono />
                <Fact
                  label="Status"
                  value={
                    claim.withdrawn
                      ? "Withdrawn"
                      : correction
                        ? "Awaiting correction"
                        : claim.status
                  }
                />
                <Fact label="Claimant" value={claim.employee} />
                <Fact label="Department" value={claim.department || "Not set"} />
                <Fact label="Submitted" value={submittedOn} />
                <Fact label="Last updated" value={updatedOn} />
              </dl>
            </div>

            <div className="claim-section">
              <div className="claim-section-label">Expense</div>
              <dl className="claim-facts">
                <Fact label="Category" value={claim.type} />
                <Fact label="Merchant" value={claim.merchant || "Not recorded"} />
                <Fact label="Expense date" value={formatSGDate(claim.date)} />
                <Fact
                  label="Fields"
                  value={
                    claim.ocrSource === "azure"
                      ? "Read off the receipt"
                      : claim.ocrSource === "unavailable"
                        ? "Typed in by hand"
                        : "Not recorded"
                  }
                />
                {claim.description && (
                  <Fact label="Description" value={claim.description} wide />
                )}
                {detailEntries.map((e, i) => (
                  <Fact key={i} label={e.label} value={String(e.value)} />
                ))}
              </dl>
            </div>

            <div className="claim-section">
              <div className="claim-section-label">Approval</div>
              <p className="claim-standing">
                {standing(claim, correction)}{" "}
                {/* Advice about a decision still to be made. Re-running the
                    rules on a settled claim says nothing anyone can act on and
                    reads as a contradiction — "Paid" over "this needs review" —
                    and today's rules may not be the ones it was judged under.
                    What the engine said at the time is in the trail below. */}
                {/* Nothing to advise while the claim is with the submitter:
                    the verdict is about a decision the approver cannot make
                    until the named fields come back. The queue already
                    suppresses the same flag on these rows. */}
                {policy && isOpen && !correction && (
                  <em className={`claim-standing-${policy.outcome}`}>
                    {policy.label ? `${policy.label} — ` : ""}
                    {policy.message}
                    {/* The API withholds a recommendation when the scan could
                        not read the receipt, and writes that decision to the
                        trail. Re-running the rules in the browser does not know
                        it, so this line said "marked ready for your approver"
                        directly above an entry reading "Recommendation withheld
                        — scan failed". */}
                    {recommendationWithheld && (
                      <>
                        {" "}
                        The recommendation is withheld:{" "}
                        {claim.ocrSource === "unavailable"
                          ? "the scan could not read this receipt, so every field was typed by hand and needs checking against the image."
                          : "the scan could not read every field, so what was typed needs checking against the image."}
                      </>
                    )}
                  </em>
                )}
              </p>

              {historyLoading ? (
                <p className="claim-standing">
                  <em>Reading the audit trail…</em>
                </p>
              ) : historyFailed ? (
                <p className="claim-standing">
                  <em>
                    The audit trail could not be loaded just now. Reload the page
                    to try again — nothing has been lost.
                  </em>
                </p>
              ) : history.length === 0 ? (
                <p className="claim-standing">
                  <em>Nothing has happened to this claim yet.</em>
                </p>
              ) : (
                <div className="claim-trail-scroll">
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
                    {history.map((entry) => (
                      <tr key={entry.id}>
                        <td className="claim-trail-when">
                          {entry.date}
                          <span className="claim-trail-sub">{entry.time}</span>
                        </td>
                        <td>{entry.action}</td>
                        <td>
                          {entry.actor}
                          <span className="claim-trail-sub">{entry.role}</span>
                        </td>
                        <td className="claim-trail-note">{entry.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>

            <div className="claim-section">
              <div className="claim-section-label">
                {outstanding.length > 0 ? "Outstanding" : "Compliance checks"}
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
          </div>

          <aside className="claim-exhibit">
            <div className="claim-section-label">Receipt on file</div>
            <figure className="claim-plate">
              {claim.receiptUrl && receiptSrc && !receiptBroken ? (
                <a href={receiptSrc} target="_blank" rel="noreferrer">
                  <img
                    src={receiptSrc}
                    alt={`Receipt for ${claim.id}`}
                    onError={markReceiptBroken}
                  />
                </a>
              ) : (
                <div className="claim-plate-empty">
                  {claim.receiptUrl
                    ? "Receipt stored, preview unavailable."
                    : "No receipt attached."}
                </div>
              )}
            </figure>
            <dl className="claim-filing">
              <Fact label="Filed against" value={claim.id} mono />
              <Fact label="Captured" value={formatSGDate(claim.date)} />
              <Fact
                label="Fields"
                value={
                  claim.ocrSource === "azure"
                    ? "Read off this image"
                    : claim.ocrSource === "unavailable"
                      ? "Typed in by hand"
                      : "Not recorded"
                }
              />
              <Fact label="Kept until" value={`${retainedUntil} · IRAS`} />
            </dl>
            {receiptSrc && !receiptBroken && (
              <a
                className="claim-plate-open"
                href={receiptSrc}
                target="_blank"
                rel="noreferrer"
              >
                Open the full image
              </a>
            )}

            {/* The money sits with the document that evidences it. It was the
                middle section of the left column while this one trailed off
                into blank space under the filing facts — and the two fields
                IRAS wants on a tax invoice above S$1,000 are facts about the
                receipt, not about the claim. */}
            <div className="claim-exhibit-money">
              <div className="claim-section-label">Amount and GST</div>
              <div className="claim-amounts">
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
                {/* Only where they matter. IRAS accepts a simplified tax
                    invoice up to S$1,000, so on a S$18.50 taxi receipt these
                    two lines said "Not captured" about something nobody needs
                    — two rows of nothing on every claim in the company. Above
                    the threshold they are the whole question, so they stay. */}
                {/* Stated once. When the two fields are missing on a claim
                    over the threshold, three rows said the same thing: "Not
                    captured", "Not captured", and "a full tax invoice is
                    required". One line carries it. */}
                {claim.supplierGstRegNumber || claim.taxInvoiceNumber ? (
                  <dl className="claim-facts claim-facts-single">
                    <Fact
                      label="Supplier GST reg. no."
                      value={claim.supplierGstRegNumber || "Not captured"}
                      muted={!claim.supplierGstRegNumber}
                    />
                    <Fact
                      label="Tax invoice no."
                      value={claim.taxInvoiceNumber || "Not captured"}
                      muted={!claim.taxInvoiceNumber}
                    />
                  </dl>
                ) : needsTaxInvoice ? (
                  <dl className="claim-facts claim-facts-single">
                    {/* Short enough to fit the column. A sentence that ends
                        in an ellipsis has hidden the half that mattered, and
                        the compliance check below spells out which two fields
                        finance still needs. */}
                    <Fact
                      label="Input tax"
                      value="Full tax invoice needed"
                      warn
                    />
                  </dl>
                ) : null}
              </div>
            </div>
          </aside>
        </div>

      </article>

      <EditClaimModal
        open={editing}
        claim={claim}
        onCancel={() => setEditing(false)}
        onSave={async (updates) => {
          try {
            await editClaim(claim.id, updates);
            refreshHistory();
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
            refreshHistory();
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

function Fact({ label, value, mono = false, muted = false, warn = false, wide = false }) {
  const cls = [
    mono ? "claim-fact-ref" : "",
    muted ? "claim-fact-muted" : "",
    warn ? "claim-fact-warn" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={wide ? "claim-fact claim-fact-wide" : "claim-fact"}>
      <dt>{label}</dt>
      {/* The value column truncates, so the full text goes in the title —
          "Two 27-inch monitors and a doc…" is a fact with its end cut off. */}
      <dd className={cls || undefined} title={typeof value === "string" ? value : undefined}>
        {value}
      </dd>
    </div>
  );
}
