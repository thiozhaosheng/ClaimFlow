import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Check,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useClaims } from "../hooks/useclaims.js";
import { useToast } from "../context/toastcontext.jsx";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import PageHeader from "../components/pageheader.jsx";
import EmptyState from "../components/emptystate.jsx";
import RejectionModal from "../components/rejectionmodal.jsx";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";
import PolicyFlag from "../components/policyflag.jsx";

export default function Approving() {
  const { latestMap, updateClaimStatus, claimsDb, error } = useClaims();
  const { addToast } = useToast();
  const [activeClaim, setActiveClaim] = useState(null);
  const [filterStatus, setFilterStatus] = useState("Pending");
  const [filterDept, setFilterDept] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingClaim, setRejectingClaim] = useState(null);

  const handleRejectConfirm = async (reason) => {
    if (!rejectingClaim) return;
    try {
      await updateClaimStatus(rejectingClaim.id, "Rejected", "Lisa Wang", reason);
      addToast({
        variant: "error",
        title: "Claim rejected",
        message: `${rejectingClaim.id} returned to ${rejectingClaim.employee}.`,
      });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Reject failed",
        message: err?.message || "Could not reject this claim.",
      });
    } finally {
      setRejectingClaim(null);
    }
  };

  const handleEndorse = async (claim) => {
    try {
      await updateClaimStatus(claim.id, "Endorsed");
      addToast({
        variant: "success",
        title: "Claim endorsed",
        message: `${claim.id} forwarded to Finance for disbursement.`,
      });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Endorse failed",
        message: err?.message || "Could not endorse this claim.",
      });
    }
  };

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
            className="flex items-center gap-4 px-3 h-9 rounded-ds-sm border border-border-subtle bg-card text-[12px] text-text-secondary tabular-nums"
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

      <div className="sidebar-layout-container">
        <aside className="sidebar-panel">
          {/* compact at-a-glance stats */}
          <div className="grid grid-cols-3 gap-2 pb-3 mb-3 border-b border-border-subtle">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Pending
              </span>
              <span className="text-lg font-bold tabular-nums leading-tight">
                {stats.pendingCount}
              </span>
              <span className="text-[10px] text-text-secondary">
                claims
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Queue
              </span>
              <span className="text-lg font-bold tabular-nums leading-tight">
                {formatSGD(stats.pendingTotal).replace("S$", "")}
              </span>
              <span className="text-[10px] text-text-secondary">SGD</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Oldest
              </span>
              <span className="text-lg font-bold tabular-nums leading-tight">
                {stats.oldestPendingDays}
              </span>
              <span className="text-[10px] text-text-secondary">days</span>
            </div>
          </div>

          <div className="mb-4">
            <p className="sidebar-meta-label flex items-center gap-1.5">
              <Filter className="h-3 w-3" /> Filters
            </p>
            <div className="mb-3">
              <label className="form-label text-xs text-text-secondary">Status</label>
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All Status">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Endorsed">Endorsed</option>
                <option value="Rejected">Rejected</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label text-xs text-text-secondary">
                Department
              </label>
              <select
                className="form-select form-select-sm"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
          </div>

          <div className="rounded-ds-md border border-border-subtle bg-subtle/50 p-3">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-text-tertiary mb-1.5">
              Scope
            </p>
            <p className="text-[13px] text-text-secondary leading-snug">
              You can review and endorse claims from{" "}
              <strong className="text-text-primary font-medium">
                Sales
              </strong>{" "}
              only. Endorsed claims are forwarded to Finance for disbursement.
            </p>
          </div>
        </aside>

        <div className="flex-1">
          <div className="workspace-card p-6">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <div>
                <h2 className="workspace-card-title mb-0.5">
                  Pending claims
                </h2>
                <p className="text-text-tertiary text-[12px]">
                  Sales department only — your scope of approval.
                </p>
              </div>
            </div>

            <div className="search-input-wrapper mb-4">
              <Search className="h-3.5 w-3.5 search-leading-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search by employee name or claim type…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="data-table align-middle">
                <thead>
                  <tr>
                    <th>EMPLOYEE NAME</th>
                    <th>SUBMISSION DATE</th>
                    <th>CLAIM TYPE</th>
                    <th>FLAG</th>
                    <th>DEPARTMENT</th>
                    <th className="text-right">TOTAL AMOUNT</th>
                    <th className="text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {matchingClaims.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-3">
                        <EmptyState
                          variant="queue"
                          title="All caught up"
                          message="No claims match your filters right now. New submissions will appear here."
                        />
                      </td>
                    </tr>
                  ) : (
                    matchingClaims.map((item) => (
                      <tr
                        key={item.id}
                        className="row-clickable"
                        onClick={() => setActiveClaim(item)}
                      >
                        <td data-label="Employee">
                          <div className="flex items-center gap-2">
                            <div className="avatar-dot">
                              {item.employee.charAt(0)}
                            </div>
                            <span className="font-medium">
                              {escapeHtml(item.employee)}
                            </span>
                          </div>
                        </td>
                        <td data-label="Date">{item.date}</td>
                        <td data-label="Category">
                          <span className="badge-custom badge-role">
                            {escapeHtml(item.type)}
                          </span>
                        </td>
                        <td data-label="Flag">
                          <PolicyFlag claim={item} variant="chip" hideAutoApproved />
                        </td>
                        <td data-label="Department">
                          <span className="text-text-secondary">
                            {item.department}
                          </span>
                        </td>
                        <td data-label="Amount" className="text-right font-bold">
                          {formatSGD(item.amount)}
                        </td>
                        <td
                          data-label="Action"
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.status === "Pending" ? (
                            <div className="flex justify-center gap-1.5">
                              <button
                                className="action-icon-btn btn-action-approve"
                                onClick={() => handleEndorse(item)}
                                aria-label="Endorse claim"
                                title="Endorse"
                              >
                                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                              </button>
                              <button
                                className="action-icon-btn btn-action-reject"
                                onClick={() => setRejectingClaim(item)}
                                aria-label="Reject claim"
                                title="Reject"
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`badge-custom badge-${item.status.toLowerCase()}`}
                            >
                              {item.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <RejectionModal
        open={!!rejectingClaim}
        claim={rejectingClaim}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectingClaim(null)}
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
