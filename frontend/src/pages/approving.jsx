import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Search,
  Paperclip,
  ChevronRight,
} from "lucide-react";
import { useClaims } from "../hooks/useclaims.js";
import { useToast } from "../context/toastcontext.jsx";
import { api } from "../utils/api.js";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import PageHeader from "../components/pageheader.jsx";
import EmptyState from "../components/emptystate.jsx";
import ReviewModal, {
  describeCorrectionFields,
} from "../components/reviewmodal.jsx";
import PolicyFlag from "../components/policyflag.jsx";
import SortHeader from "../components/sortheader.jsx";
import AnimatedNumber from "../components/animatednumber.jsx";
import { useSort } from "../hooks/usesort.js";
import { useRowExit } from "../hooks/useRowExit.js";
import { useShortcuts } from "../hooks/useShortcuts.js";
import "../components/review-flow.css";

/**
 * A pending claim carrying a correction request is waiting on the submitter,
 * not on the approver — the queue has to say so rather than showing another
 * Review button that would only re-read the same mismatched fields.
 */
const correctionOf = (claim) => claim?.details?.correctionRequest || null;

/**
 * Days a claim has been waiting — the thing an approver triages on.
 *
 * Measured from when it was SUBMITTED, not from the expense date. The column's
 * own tooltip already said "Submitted N days ago" while the number underneath
 * was the age of the receipt: a claim for a conference in May, filed this
 * morning, sat at the top of the queue reading "94d" as though the approver had
 * been ignoring it for three months.
 */
const waitingDays = (claim) => {
  const raw = claim?.createdAt || claim?.date;
  const d = raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
};
const AWAITING_FILTER = "Awaiting correction";

export default function Approving() {
  const navigate = useNavigate();
  const { latestMap, updateClaimStatus, error, refetch } = useClaims();
  const { addToast } = useToast();
  // The sidebar's saved views drive this through ?status= — one source of
  // truth, so a view is a real link (shareable, back-button-able) rather than
  // a second copy of the filter state.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const [filterStatus, setFilterStatusRaw] = useState(urlStatus || "Pending");
  const setFilterStatus = (next) => {
    setFilterStatusRaw(next);
    const params = new URLSearchParams(searchParams);
    if (next === "Pending") params.delete("status");
    else params.set("status", next);
    setSearchParams(params, { replace: true });
  };
  useEffect(() => {
    if (urlStatus && urlStatus !== filterStatus) setFilterStatusRaw(urlStatus);
    if (!urlStatus && filterStatus !== "Pending") setFilterStatusRaw("Pending");
  }, [urlStatus]);
  const [filterDept, setFilterDept] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const queueExit = useRowExit();
  const [reviewClaim, setReviewClaim] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);

  // Opening a claim from the queue lands on its record, and the record is the
  // one place an approver could read everything and do nothing about it. Its
  // Review button sends them back here with ?review=CLM-…, which opens the
  // same gated flow the row's button opens. The parameter is cleared straight
  // away so a refresh does not reopen it.
  const reviewParam = searchParams.get("review");
  useEffect(() => {
    if (!reviewParam) return;
    // Wait for the claims to arrive. Clearing the parameter on the first render
    // — before the fetch resolves and latestMap is still empty — threw the
    // request away and landed the approver on the plain queue.
    const target = latestMap[reviewParam];
    if (!target) return;
    setReviewClaim(target);
    setReviewAction(null);
    const params = new URLSearchParams(searchParams);
    params.delete("review");
    setSearchParams(params, { replace: true });
  }, [reviewParam, latestMap]);

  const handleReviewConfirm = async (actionType, reason, fields = []) => {
    if (!reviewClaim) return;
    // A decision takes the claim out of the queue the approver is looking at,
    // and the row that changed is what the decision produced. It leaves while
    // the request runs. (A correction request leaves the Pending view too —
    // the claim moves to Awaiting correction.)
    const leavingId = reviewClaim.id;
    try {
      if (actionType === "request-changes") {
        // The claim stays Pending and keeps its receipt, its OCR result and
        // its id — only the named fields go back to the submitter. This is
        // the path that replaces chasing them outside the portal.
        await queueExit.exit([leavingId], async () => {
          await api.patch(`/api/workflow/review/${reviewClaim.rawId}`, {
            action: "request-changes",
            remarks: reason || undefined,
            fields,
          });
          await refetch();
        });
        addToast({
          variant: "warning",
          title: "Correction requested",
          message: `${reviewClaim.id} went back to ${reviewClaim.employee} for ${describeCorrectionFields(fields)}.`,
        });
      } else if (actionType === "reject") {
        await queueExit.exit([leavingId], () =>
          updateClaimStatus(reviewClaim.id, "Rejected", reason),
        );
        addToast({
          variant: "error",
          title: "Claim rejected",
          message: `${reviewClaim.id} returned to ${reviewClaim.employee}.`,
        });
      } else if (actionType === "endorse") {
        await queueExit.exit([leavingId], () =>
          updateClaimStatus(reviewClaim.id, "Endorsed", reason),
        );
        addToast({
          variant: "success",
          title: "Claim endorsed",
          message: `${reviewClaim.id} forwarded to Finance for disbursement.`,
        });
      }
    } catch (err) {
      addToast({
        variant: "error",
        title:
          actionType === "request-changes"
            ? "Correction request failed"
            : `${actionType === "reject" ? "Reject" : "Endorse"} failed`,
        message: err?.message || "Could not record that decision on this claim.",
      });
    } finally {
      setReviewClaim(null);
      setReviewAction(null);
    }
  };

  // What an approver actually sorts by: how long it has waited, how much it
  // is for, whose it is.
  const QUEUE_COLUMNS = useMemo(
    () => ({
      id: (c) => c.id,
      employee: (c) => c.employee,
      type: (c) => c.type,
      // The column is Waiting, so it sorts on the submission clock — sorting
      // it by expense date put a freshly-filed old receipt above a claim that
      // had genuinely been sitting there a fortnight.
      date: (c) => c.createdAt || c.date,
      amount: (c) => Number(c.amount),
    }),
    [],
  );

  useShortcuts({
    onSearch: () => {
      document.getElementById("manager-search-input")?.focus();
    }
  });

  // The department this officer approves for, read from the claims the API
  // returns them — which is now scoped server-side. It was the literal string
  // "Sales" in four places, so an approver in Marketing or Engineering got an
  // empty queue, a scope tile naming someone else's department, and a filter
  // offering one option that was not theirs.
  const ownDepartment =
    Object.values(latestMap).find((c) => c.department)?.department || null;

  const matchingClaims = Object.values(latestMap).filter((item) => {
    if (filterStatus === AWAITING_FILTER) {
      if (item.status !== "Pending" || !correctionOf(item)) return false;
    } else if (filterStatus !== "All Status" && item.status !== filterStatus) {
      return false;
    }
    if (filterDept !== "All" && item.department !== filterDept) return false;
    // The field said "Search by ID or employee name" and did not search the
    // id: it matched the employee and the category only, so typing CLM-1555 —
    // the reference printed in the first column of every row, and the thing an
    // approver is handed when someone asks about a claim — returned an empty
    // queue. The reference is included now, and bare digits work too because
    // "clm-1555" contains "1555". Category stays, and is named on the label.
    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      const matches =
        item.id.toLowerCase().includes(q) ||
        item.employee.toLowerCase().includes(q) ||
        (item.type || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const deptClaims = Object.values(latestMap);

  // Oldest first. The metric band says "Oldest: 86 days" while newest-first
  // buried that exact claim at the bottom of the last page — a queue is
  // worked from the back of the line, and the aggregate should point at a row
  // the reader can see.
  const sort = useSort(matchingClaims, QUEUE_COLUMNS, "date", "asc");
  const sortedClaims = sort.rows;

  const stats = useMemo(() => {
    const pending = deptClaims.filter((c) => c.status === "Pending");
    const endorsed = deptClaims.filter((c) => c.status === "Endorsed");
    const paid = deptClaims.filter((c) => c.status === "Paid");
    const rejected = deptClaims.filter((c) => c.status === "Rejected");
    // Same clock as the Waiting column, so the aggregate is traceable to the
    // row it came from.
    const oldestPendingDays = pending.reduce((max, c) => {
      const days = waitingDays(c);
      return days === null ? max : Math.max(max, days);
    }, 0);
    return {
      pendingCount: pending.length,
      awaitingCorrectionCount: pending.filter((c) => correctionOf(c)).length,
      pendingTotal: pending.reduce((s, c) => s + c.amount, 0),
      endorsedCount: endorsed.length,
      paidCount: paid.length,
      rejectedCount: rejected.length,
      oldestPendingDays,
    };
  }, [deptClaims]);

  return (
    <section id="view-approving" className="role-workspace">
      <PageHeader
        eyebrow={`Approving officer${ownDepartment ? ` · ${ownDepartment}` : ""}`}
        title="Approval queue"
        subtitle="Every claim walks through the same three steps: verify the receipt against the typed fields, weigh the policy recommendation, then record your decision. The engine only recommends — the call is yours."
        actions={
          <div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 py-1.5 min-h-[36px] rounded-ds-sm border border-border-subtle bg-card text-[12px] text-text-secondary tabular-nums"
            aria-label="Sales department pipeline"
          >
            <span>
              {/* Not amber: pending is the ordinary state, and colouring it
                  put a warning tint on the biggest number on the page. */}
              <b className="font-semibold text-text-primary">{stats.pendingCount}</b>{" "}
              pending
            </span>
            <span className="h-3 w-px bg-border-subtle" aria-hidden="true" />
            <span>
              <b className="font-semibold text-accent">{stats.endorsedCount}</b>{" "}
              endorsed
            </span>
            <span className="h-3 w-px bg-border-subtle" aria-hidden="true" />
            <span>
              <b className="font-semibold text-success-text">{stats.paidCount}</b>{" "}
              paid
            </span>
            <span className="h-3 w-px bg-border-subtle" aria-hidden="true" />
            <span>
              <b className="font-semibold text-danger-text">{stats.rejectedCount}</b>{" "}
              rejected
            </span>
          </div>
        }
      />

      {error && (
        <div className="data-error" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <strong>Could not load claims</strong>
            <span>{error.message}</span>
          </div>
        </div>
      )}

      {/* mb-10 keeps the 40px that used to come from the wrapper plus the
          component's own margin, now that the band owns no outer spacing. */}
      <div className="mt-6 mb-10">
        <div className="metric-strip">
          <div className="metric-item">
            <span className="metric-item-label">Pending</span>
            <span className="metric-item-value">
              <AnimatedNumber value={stats.pendingCount} />
            </span>
            <span className="metric-item-sub">
              {stats.awaitingCorrectionCount > 0
                ? `claims · ${stats.awaitingCorrectionCount} awaiting correction`
                : "claims"}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-item-label">Queue</span>
            <span className="metric-item-value">
              {/* With its S$ — every other amount in the app carries it, and
                  a bare 2,916.93 over a lone "SGD" was the exception. */}
              <AnimatedNumber
                value={stats.pendingTotal}
                decimals={2}
                format={(n) => formatSGD(n)}
              />
            </span>
            <span className="metric-item-sub">awaiting your decision</span>
          </div>
          <div className="metric-item">
            <span className="metric-item-label">Oldest</span>
            <span className="metric-item-value">
              <AnimatedNumber value={stats.oldestPendingDays} />
            </span>
            <span className="metric-item-sub">days</span>
          </div>
          {/* Neutral like its siblings: a scope label is information, not a
              signal, and tinting it brand-blue spent colour on decoration. */}
          <div className="metric-item">
            <span className="metric-item-label">Scope</span>
            <span className="text-sm font-medium mt-1">
              {ownDepartment ? `${ownDepartment} Department` : "Your department"}
            </span>
            <span className="metric-item-sub">
              {ownDepartment
                ? `Review and endorse claims from ${ownDepartment} only.`
                : "Review and endorse claims from your department."}
            </span>
          </div>
        </div>
      </div>

      <div className="data-toolbar">
         <div className="data-toolbar-filters">
            <select
              className="form-select form-select-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '168px' }}
              aria-label="Filter by status"
            >
              <option value="All Status">All Status</option>
              <option value="Pending">Pending</option>
              <option value={AWAITING_FILTER}>Awaiting correction</option>
              <option value="Endorsed">Endorsed</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
            </select>
            {/* Dropped: a department filter whose only option was the one
                department this officer can already see. A control with one
                choice is not a control. */}
         </div>
         {/* A real width, not a cap. This was `sm:w-auto` with a 280px
             max-width, so the box took the input's intrinsic size — 220px —
             and the max-width never applied. The placeholder needed 229px of
             the 170px left inside it and was cut off mid-word, with no
             ellipsis to show it. The toolbar is 1184px wide and was using 400
             of them. */}
         <div className="search-input-wrapper m-0 w-full sm:w-[320px] sm:flex-shrink-0">
           <Search className="h-3.5 w-3.5 search-leading-icon" />
           <input
             id="manager-search-input"
             type="search"
             className="form-control"
             placeholder="Reference, name or category"
             aria-label="Search the queue by claim reference, employee name or category"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
         </div>
      </div>

      <div className="workspace-card p-6 rounded-t-none border-t-0">

            {matchingClaims.length === 0 ? (
              <EmptyState
                variant="queue"
                title="All caught up"
                message="No claims match your filters right now. New submissions will appear here."
              />
            ) : (
              /* A ledger, not a feed. Each claim used to be a floating card
                 with an avatar and a shadow that lifted on hover — consumer
                 furniture on the screen an approver spends their day in. A
                 table puts the columns an approver compares (amount, category,
                 age) on shared axes and fits three times as many rows on one
                 screen. NOTE: a JSX-brace comment cannot sit directly inside
                 a parenthesised ternary branch — Babel rejects it, so this is
                 a plain block comment. */
              <div className="data-panel-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <SortHeader label="Reference" sortKey="id" state={sort} />
                      <SortHeader label="Employee" sortKey="employee" state={sort} />
                      <SortHeader label="Category" sortKey="type" state={sort} />
                      <th scope="col">Policy</th>
                      <SortHeader label="Waiting" sortKey="date" state={sort} className="num" />
                      <SortHeader label="Amount" sortKey="amount" state={sort} className="num" />
                      <th scope="col"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                {sortedClaims.map((item) => {
                  const correction = correctionOf(item);
                  const awaitingCorrection =
                    item.status === "Pending" && !!correction;
                  return (
                  <tr
                    key={item.id}
                    className={queueExit.isLeaving(item.id) ? "row-leaving" : undefined}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/claim/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/claim/${item.id}`);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span className="data-ref">{item.id}</span>
                      <span className="queue-date">{item.date}</span>
                    </td>
                    <td>
                      <span className="queue-name" title={item.employee}>
                        {escapeHtml(item.employee)}
                      </span>
                      <span className="queue-dept">{item.department}</span>
                    </td>
                    <td>
                      {/* No icon tile in the cell. A ledger names the category;
                          a coloured glyph per row is decoration that repeats
                          the word beside it. */}
                      <span className="queue-cat">{escapeHtml(item.type)}</span>
                    </td>
                    <td>
                      {awaitingCorrection ? (
                        /* The policy verdict is moot while the submitter is
                           fixing the fields — a "needs review" flag here would
                           point at the wrong person. */
                        <span
                          className="claim-chip claim-chip-awaiting"
                          title={`Sent back for ${describeCorrectionFields(correction.fields)}`}
                        >
                          Awaiting correction
                        </span>
                      ) : (
                        <PolicyFlag claim={item} variant="chip" hideAutoApproved />
                      )}
                    </td>
                    {/* The queue's real triage axis. It existed only as an
                        aggregate ("oldest 36 days") — per row it tells the
                        approver which claim to open first, and it puts the
                        table's spare width to work carrying information
                        instead of air. */}
                    <td className="num">
                      {(() => {
                        const d = waitingDays(item);
                        if (d === null) return <span className="queue-wait">—</span>;
                        return (
                          <span
                            className={`queue-wait${d >= 30 ? " queue-wait-old" : ""}`}
                            title={`Submitted ${d} day${d === 1 ? "" : "s"} ago`}
                          >
                            {d}d
                          </span>
                        );
                      })()}
                    </td>
                    <td className="num">
                      <span className="queue-amount">{formatSGD(item.amount)}</span>
                      {item.receiptUrl && (
                        <span className="queue-receipt" title="Receipt attached">
                          <Paperclip className="h-3 w-3" />
                        </span>
                      )}
                    </td>
                    <td
                      className="num"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {awaitingCorrection ? (
                        /* No Review button: the next move belongs to the
                           submitter, and the row says whose it is. */
                        <span className="claim-row-waiting">
                          Waiting on {item.employee.split(" ")[0]}
                        </span>
                      ) : item.status === "Pending" ? (
                        <button
                          className="row-btn row-btn-review"
                          onClick={() => { setReviewClaim(item); setReviewAction(null); }}
                          title="Review this claim step by step"
                        >
                          <span>Review</span>
                        </button>
                      ) : (
                        <span
                          className={`badge-custom badge-${item.status.toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

    <ReviewModal
        open={!!reviewClaim}
        claim={reviewClaim}
        actionType={reviewAction}
        onConfirm={handleReviewConfirm}
        onCancel={() => { setReviewClaim(null); setReviewAction(null); }}
      />

    </section>
  );
}
