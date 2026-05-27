import { useState } from "react";
import { useClaims } from "../hooks/useclaims.js";
import { useToast } from "../context/toastcontext.jsx";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import WelcomeStrip from "../components/welcomestrip.jsx";
import EmptyState from "../components/emptystate.jsx";
import RejectionModal from "../components/rejectionmodal.jsx";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";

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

  const pendingCount = Object.values(latestMap).filter(
    (i) => i.department === "Sales" && i.status === "Pending",
  ).length;

  return (
    <section id="view-approving" className="role-workspace">
      <WelcomeStrip
        title="Pending claims for your department"
        subtitle="Review the receipt and endorse or reject — comments help the claimant if you reject."
        activeStage="pending"
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
                    <th>DEPARTMENT</th>
                    <th className="text-right">TOTAL AMOUNT</th>
                    <th className="text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {matchingClaims.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-3">
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
