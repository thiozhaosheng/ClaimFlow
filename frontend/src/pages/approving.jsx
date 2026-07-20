import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Filter,
  Search,
  X,
  Paperclip,
  ChevronRight,
} from "lucide-react";
import { useClaims } from "../hooks/useclaims.js";
import { useToast } from "../context/toastcontext.jsx";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import PageHeader from "../components/pageheader.jsx";
import EmptyState from "../components/emptystate.jsx";
import ReviewModal from "../components/reviewmodal.jsx";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";
import PolicyFlag from "../components/policyflag.jsx";
import CategoryIcon from "../components/categoryicon.jsx";
import { useShortcuts } from "../hooks/useShortcuts.js";

export default function Approving() {
  const navigate = useNavigate();
  const { latestMap, updateClaimStatus, claimsDb, error } = useClaims();
  const { addToast } = useToast();
  const [activeClaim, setActiveClaim] = useState(null);
  const [filterStatus, setFilterStatus] = useState("Pending");
  const [filterDept, setFilterDept] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewClaim, setReviewClaim] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);

  const handleReviewConfirm = async (actionType, reason) => {
    if (!reviewClaim) return;
    try {
      if (actionType === "reject") {
        await updateClaimStatus(reviewClaim.id, "Rejected", "Lisa Wang", reason);
        addToast({
          variant: "error",
          title: "Claim rejected",
          message: `${reviewClaim.id} returned to ${reviewClaim.employee}.`,
        });
      } else if (actionType === "endorse") {
        await updateClaimStatus(reviewClaim.id, "Endorsed", "Lisa Wang", reason);
        addToast({
          variant: "success",
          title: "Claim endorsed",
          message: `${reviewClaim.id} forwarded to Finance for disbursement.`,
        });
      }
    } catch (err) {
      addToast({
        variant: "error",
        title: `${actionType === "reject" ? "Reject" : "Endorse"} failed`,
        message: err?.message || `Could not ${actionType} this claim.`,
      });
    } finally {
      setReviewClaim(null);
      setReviewAction(null);
    }
  };

  useShortcuts({
    onSearch: () => {
      document.getElementById("manager-search-input")?.focus();
    }
  });

  const matchingClaims = Object.values(latestMap).filter((item) => {
    if (item.department !== "Sales") return false;
    if (filterStatus !== "All Status" && item.status !== filterStatus)
      return false;
    if (filterDept !== "All" && item.department !== filterDept) return false;
    if (
      searchQuery &&
      !item.employee.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const deptClaims = Object.values(latestMap).filter(
    (c) => c.department === "Sales",
  );

  const stats = useMemo(() => {
    const pending = deptClaims.filter((c) => c.status === "Pending");
    const endorsed = deptClaims.filter((c) => c.status === "Endorsed");
    const paid = deptClaims.filter((c) => c.status === "Paid");
    const rejected = deptClaims.filter((c) => c.status === "Rejected");
    const oldestPendingDays = pending.reduce((max, c) => {
      const d = c.date ? new Date(c.date) : null;
      if (!d || Number.isNaN(d.getTime())) return max;
      const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
      return Math.max(max, days);
    }, 0);
    return {
      pendingCount: pending.length,
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
        eyebrow="Approving officer · Sales"
        title="Approval queue"
        subtitle="Endorse claims from your department or send them back with a reason. Auto-extracted fields, policy hints, and full receipt context are surfaced inline so reviews stay under a minute."
        actions={
          <div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 py-1.5 min-h-[36px] rounded-ds-sm border border-border-subtle bg-card text-[12px] text-text-secondary tabular-nums"
            aria-label="Sales department pipeline"
          >
            <span>
              <b className="font-semibold text-warning-text">{stats.pendingCount}</b>{" "}
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

      <div className="mt-6 mb-4">
        <div className="metric-strip">
          <div className="metric-card">
            <span className="metric-label">Pending</span>
            <span className="metric-value">{stats.pendingCount}</span>
            <span className="metric-sub">claims</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Queue</span>
            <span className="metric-value">{formatSGD(stats.pendingTotal).replace("S$", "")}</span>
            <span className="metric-sub">SGD</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Oldest</span>
            <span className="metric-value">{stats.oldestPendingDays}</span>
            <span className="metric-sub">days</span>
          </div>
          <div className="metric-card" style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info)' }}>
            <span className="metric-label" style={{ color: 'var(--info-text)' }}>Scope</span>
            <span className="text-sm font-medium mt-1">Sales Department</span>
            <span className="metric-sub" style={{ color: 'var(--info-text)' }}>Review and endorse claims from Sales only.</span>
          </div>
        </div>
      </div>

      <div className="data-toolbar">
         <div className="data-toolbar-filters">
            <select
              className="form-select form-select-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '130px' }}
            >
              <option value="All Status">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Endorsed">Endorsed</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
            </select>
            <select
              className="form-select form-select-sm"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{ width: '120px' }}
            >
              <option value="All">All Depts</option>
              <option value="Sales">Sales</option>
            </select>
         </div>
         <div className="search-input-wrapper m-0 w-full sm:w-auto" style={{ maxWidth: "280px" }}>
           <Search className="h-3.5 w-3.5 search-leading-icon" />
           <input
             id="manager-search-input"
             type="text"
             className="form-control"
             placeholder="Search by ID or employee name"
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
              <div className="claim-rows">
                {matchingClaims.map((item) => (
                  <div
                    key={item.id}
                    className="claim-row stagger-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/claim/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        navigate(`/claim/${item.id}`);
                    }}
                  >
                    {/* identity */}
                    <div className="claim-row-id">
                      <div className="avatar-dot">{item.employee.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="claim-row-name">
                          {escapeHtml(item.employee)}
                        </div>
                        <div className="claim-row-sub">
                          {item.id} · {item.date} · {item.department}
                        </div>
                      </div>
                    </div>

                    {/* tags */}
                    <div className="claim-row-tags">
                      <span className="claim-chip">
                        <CategoryIcon category={item.type} size={20} />
                        {escapeHtml(item.type)}
                      </span>
                      {item.receiptUrl && (
                        <span className="claim-chip claim-chip-file">
                          <Paperclip className="h-3 w-3" />
                          Receipt
                        </span>
                      )}
                      <PolicyFlag claim={item} variant="chip" hideAutoApproved />
                    </div>

                    {/* amount */}
                    <div className="claim-row-amount">{formatSGD(item.amount)}</div>

                    {/* action / status */}
                    <div
                      className="claim-row-action"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.status === "Pending" ? (
                        <>
                          <button
                            className="row-btn row-btn-approve"
                            onClick={() => { setReviewClaim(item); setReviewAction("endorse"); }}
                            title="Endorse"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                            <span>Endorse</span>
                          </button>
                          <button
                            className="row-btn row-btn-reject"
                            onClick={() => { setReviewClaim(item); setReviewAction("reject"); }}
                            aria-label="Reject claim"
                            title="Reject"
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </>
                      ) : (
                        <span
                          className={`badge-custom badge-${item.status.toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 claim-row-chevron" />
                    </div>
                  </div>
                ))}
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

      <ClaimDetailModal
        open={!!activeClaim}
        claim={activeClaim}
        history={
          activeClaim
            ? claimsDb.filter((log) => log.id === activeClaim.id)
            : []
        }
        onClose={() => setActiveClaim(null)}
      />
    </section>
  );
}
