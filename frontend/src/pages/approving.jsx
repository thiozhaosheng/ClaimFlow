import { useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
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

  const pendingCount = stats.pendingCount;

  return (
    <section id="view-approving" className="role-workspace">
      <PageHeader
        title="Approval queue"
        subtitle="Endorse claims from your department or send them back with a reason. Auto-extracted fields, policy hints, and full receipt context are surfaced inline so reviews stay under a minute."
        actions={
          <div className="claim-pipeline-pill" aria-label="Sales department pipeline">
            <span className="claim-pipeline-pill-stage tone-warning">
              <b>{stats.pendingCount}</b>Pending
            </span>
            <ArrowRight className="claim-pipeline-pill-connector" aria-hidden="true" />
            <span className="claim-pipeline-pill-stage tone-accent">
              <b>{stats.endorsedCount}</b>Endorsed
            </span>
            <ArrowRight className="claim-pipeline-pill-connector" aria-hidden="true" />
            <span className="claim-pipeline-pill-stage tone-success">
              <b>{stats.paidCount}</b>Paid
            </span>
            <ArrowRight className="claim-pipeline-pill-connector" aria-hidden="true" />
            <span className="claim-pipeline-pill-stage tone-danger">
              <b>{stats.rejectedCount}</b>Rejected
            </span>
          </div>
        }
      />

      {error && (
        <div className="data-error" role="alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
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
            <p className="sidebar-meta-label">
              <i className="fa-solid fa-filter mr-1"></i> Filters
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

          <div className="flex flex-col gap-3">
            <div className="stat-widget-box">
              <span className="widget-title">Pending Review</span>
              <span className="widget-value highlight-blue">
                {pendingCount}
              </span>
            </div>
            <div className="stat-widget-box">
              <span className="widget-title">Your Department</span>
              <span className="widget-value text-text-primary font-semibold">
                Sales
              </span>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="workspace-card p-6">
            <h2 className="workspace-card-title mb-1">
              Pending Claims Dashboard
            </h2>
            <p className="text-text-secondary text-xs mb-3">
              Review and endorse claims from Sales department
            </p>

            <div className="alert-custom-info p-3 mb-4 flex items-center" role="alert">
              <i className="fa-solid fa-circle text-accent text-[0.5rem] mr-2"></i>
              <span>
                <strong>Departmental View:</strong> You can only view and
                approve claims from the Sales department
              </span>
            </div>

            <div className="search-input-wrapper mb-4">
              <i className="fa-solid fa-magnifying-glass search-leading-icon"></i>
              <input
                type="text"
                className="form-control"
                placeholder="Search by employee name or claim type..."
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
                            <div className="flex justify-center gap-2">
                              <button
                                className="action-icon-btn btn-action-approve"
                                onClick={() => handleEndorse(item)}
                                aria-label="Endorse claim"
                              >
                                <i className="fa-solid fa-check"></i>
                              </button>
                              <button
                                className="action-icon-btn btn-action-reject"
                                onClick={() => setRejectingClaim(item)}
                                aria-label="Reject claim"
                              >
                                <i className="fa-solid fa-xmark"></i>
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
