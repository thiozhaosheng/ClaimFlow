import { useState } from "react";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { useClaims } from "../hooks/useclaims.js";
import { escapeHtml } from "../utils/helpers.js";
import WelcomeStrip from "../components/welcomestrip.jsx";
import EmptyState from "../components/emptystate.jsx";
import { exportAuditLogToCsv } from "../utils/export.js";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";

export default function Finance() {
  const { session, setFinanceTab } = useAuth();
  const { addToast } = useToast();
  const { claimsDb, latestMap, batchMarkAsPaid } = useClaims();
  const [activeTab, setActiveTab] = useState(session?.financeTab || "audit");
  const [searchQueue, setSearchQueue] = useState("");
  const [searchAudit, setSearchAudit] = useState("");
  const [auditFilter, setAuditFilter] = useState("All");
  const [selectedClaims, setSelectedClaims] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [activeClaim, setActiveClaim] = useState(null);

  const switchTab = (tabKey) => {
    setActiveTab(tabKey);
    setFinanceTab(tabKey);
    if (tabKey === "payment") {
      setSelectedClaims(new Set());
      setSelectAll(false);
    }
  };

  const endorsedClaims = Object.values(latestMap).filter((i) => {
    if (i.status !== "Endorsed") return false;
    if (
      searchQueue &&
      !i.employee.toLowerCase().includes(searchQueue.toLowerCase()) &&
      !i.id.toLowerCase().includes(searchQueue.toLowerCase())
    )
      return false;
    return true;
  });

  const handleRowSelect = (claimId, checked) => {
    const updated = new Set(selectedClaims);
    if (checked) updated.add(claimId);
    else updated.delete(claimId);
    setSelectedClaims(updated);
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedClaims(new Set(endorsedClaims.map((c) => c.id)));
    } else {
      setSelectedClaims(new Set());
    }
  };

  const selectedTotal = Array.from(selectedClaims).reduce((sum, id) => {
    const claim = latestMap[id];
    return claim ? sum + claim.amount : sum;
  }, 0);

  const handleMarkAsPaid = () => {
    if (selectedClaims.size === 0) return;
    const count = selectedClaims.size;
    batchMarkAsPaid(selectedClaims);
    addToast({
      variant: "success",
      title: `${count} claim${count === 1 ? "" : "s"} marked as paid`,
      message: `Total $${selectedTotal.toFixed(2)} disbursed.`,
    });
    setSelectedClaims(new Set());
    setSelectAll(false);
  };

  const filteredLogs = claimsDb.filter((log) => {
    if (auditFilter !== "All") {
      if (auditFilter === "Submitted" && log.action !== "Claim submitted")
        return false;
      if (auditFilter === "Endorsed" && !log.action.includes("Endorsed"))
        return false;
      if (auditFilter === "Paid" && log.action !== "Marked as paid")
        return false;
    }
    if (
      searchAudit &&
      !log.id.toLowerCase().includes(searchAudit.toLowerCase()) &&
      !log.employee.toLowerCase().includes(searchAudit.toLowerCase()) &&
      !log.actor.toLowerCase().includes(searchAudit.toLowerCase())
    )
      return false;
    return true;
  });

  const uniqueClaimIds = new Set(claimsDb.map((c) => c.id));

  const exportCsv = () => {
    const hasActiveFilter =
      auditFilter !== "All" || searchAudit.trim().length > 0;
    const logsToExport = hasActiveFilter ? filteredLogs : claimsDb;
    const exported = exportAuditLogToCsv(logsToExport, {
      filenameSuffix: hasActiveFilter ? "filtered" : "full",
    });
    if (exported) {
      addToast({
        variant: "success",
        title: "Audit log exported",
        message: `${logsToExport.length} ${hasActiveFilter ? "filtered " : ""}entries downloaded as CSV.`,
      });
    } else {
      addToast({
        variant: "info",
        title: "Nothing to export",
        message: "There are no log entries that match your current view.",
      });
    }
  };

  return (
    <section id="view-finance" className="role-workspace">
      <WelcomeStrip
        title="Process endorsed claims"
        subtitle="Mark approved claims as paid once disbursed — every action is recorded in the audit trail."
        activeStage={activeTab === "audit" ? "reimbursed" : "endorsed"}
      />
      <ul className="nav sub-tabs-layer mb-4">
        <li className="nav-item">
          <button
            className={`nav-link sub-tab-link ${activeTab === "payment" ? "active" : ""}`}
            onClick={() => switchTab("payment")}
          >
            <i className="fa-solid fa-wallet me-2"></i>Payment Queue
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link sub-tab-link ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => switchTab("audit")}
          >
            <i className="fa-solid fa-file-shield me-2"></i>Audit Trail
          </button>
        </li>
      </ul>

      <div
        className={`workspace-card p-4 ${activeTab !== "payment" ? "d-none" : ""}`}
      >
        <h2 className="workspace-card-title row-heading mb-1">
          Endorsed Claims Queue
        </h2>
        <p className="text-secondary small mb-4">
          Process endorsed claims for disbursement
        </p>

        <div className="action-bar-strip d-flex flex-wrap justify-content-between align-items-center gap-3 p-3 border mb-3 rounded-3 bg-light">
          <div className="d-flex align-items-center gap-2">
            <div
              className="search-input-wrapper m-0"
              style={{ maxWidth: "280px" }}
            >
              <i className="fa-solid fa-magnifying-glass search-leading-icon"></i>
              <input
                type="text"
                className="form-control py-1 ps-5"
                placeholder="Search by ID or Employee Name"
                value={searchQueue}
                onChange={(e) => setSearchQueue(e.target.value)}
              />
            </div>
            <button className="btn btn-outline-secondary btn-sm px-3 py-2 bg-white">
              <i className="fa-solid fa-filter me-1"></i>Filter
            </button>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <span className="text-secondary small block-span">
                Selected Total
              </span>
              <span className="font-bold fs-5 text-dark">
                ${selectedTotal.toFixed(2)}
              </span>
            </div>
            <button
              className={`btn btn-mark-paid ${selectedClaims.size === 0 ? "disabled" : ""}`}
              disabled={selectedClaims.size === 0}
              onClick={handleMarkAsPaid}
            >
              <i className="fa-regular fa-circle-check me-2"></i>Mark as Paid (
              <span>{selectedClaims.size}</span>)
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table data-table align-middle">
            <thead>
              <tr>
                <th width="40" className="text-center">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>CLAIM ID</th>
                <th>Employee</th>
                <th>Bank Account</th>
                <th className="text-end">Endorsed Amount</th>
              </tr>
            </thead>
            <tbody>
              {endorsedClaims.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-3">
                    <EmptyState
                      variant="queue"
                      title="Nothing pending payout"
                      message="Endorsed claims from approvers will queue up here for disbursement."
                    />
                  </td>
                </tr>
              ) : (
                endorsedClaims.map((item) => (
                  <tr
                    key={item.id}
                    className="row-clickable"
                    onClick={() => setActiveClaim(item)}
                  >
                    <td
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedClaims.has(item.id)}
                        onChange={(e) =>
                          handleRowSelect(item.id, e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <strong className="text-dark">{item.id}</strong>
                      <br />
                      <span
                        className="text-secondary"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {item.date}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold">
                        {escapeHtml(item.employee)}
                      </span>
                      <br />
                      <span className="text-secondary small">
                        {item.department}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-role text-dark py-1 px-2">
                        <i className="fa-solid fa-building-columns me-1 text-secondary"></i>
                        BANK {item.bank}
                      </span>
                    </td>
                    <td className="text-end font-bold text-dark">
                      ${item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={`workspace-card p-4 ${activeTab !== "audit" ? "d-none" : ""}`}
      >
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-1">
          <div>
            <h2 className="workspace-card-title row-heading mb-1">
              Audit Trail & Export
            </h2>
            <p className="text-secondary small">
              Read-only log of all claim status changes and actions
            </p>
          </div>
          <button
            className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2 font-medium shadow-sm"
            onClick={exportCsv}
          >
            <i className="fa-solid fa-download"></i> Export to CSV
          </button>
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 my-4">
          <div
            className="search-input-wrapper m-0 flex-grow-1"
            style={{ maxWidth: "500px" }}
          >
            <i className="fa-solid fa-magnifying-glass search-leading-icon"></i>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Claim ID, Employee, or Actor..."
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
            />
          </div>

          <div className="segmented-control" role="group">
            {["All", "Submitted", "Endorsed", "Paid"].map((status) => (
              <button
                key={status}
                className={`segment-btn ${auditFilter === status ? "active" : ""}`}
                onClick={() => setAuditFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table data-table align-middle">
            <thead>
              <tr>
                <th>
                  <i className="fa-regular fa-calendar me-2"></i>Timestamp
                </th>
                <th>
                  <i className="fa-regular fa-file-lines me-2"></i>Claim ID
                </th>
                <th>Employee</th>
                <th className="text-end">Amount</th>
                <th>
                  <i className="fa-solid fa-chart-line me-2"></i>Action
                </th>
                <th>
                  <i className="fa-regular fa-user me-2"></i>Actor
                </th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-3">
                    <EmptyState
                      variant="audit"
                      title="No matching audit entries"
                      message="Try adjusting filters or search terms to see logged actions."
                    />
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  let roleBadgeClass = "bg-light text-dark border";
                  if (log.role === "Approving Officer")
                    roleBadgeClass =
                      "text-primary bg-primary-subtle border border-primary-subtle";
                  if (log.role === "Finance Admin")
                    roleBadgeClass =
                      "text-info bg-info-subtle border border-info-subtle";

                  return (
                    <tr
                      key={`${log.id}-${idx}`}
                      className="row-clickable"
                      onClick={() => setActiveClaim(log)}
                    >
                      <td className="text-nowrap text-secondary font-medium">
                        {log.date}{" "}
                        <span
                          className="ms-1 text-muted fw-normal"
                          style={{ fontSize: "0.8rem" }}
                        >
                          {log.time}
                        </span>
                      </td>
                      <td>
                        <span className="text-primary font-semibold">
                          {log.id}
                        </span>
                        <br />
                        <span className="text-muted small">
                          {escapeHtml(log.type)}
                        </span>
                      </td>
                      <td className="font-medium">
                        {escapeHtml(log.employee)}
                      </td>
                      <td className="text-end font-bold text-dark">
                        ${log.amount.toFixed(2)}
                      </td>
                      <td>
                        <span className="text-dark font-medium">
                          {escapeHtml(log.action)}
                        </span>
                      </td>
                      <td className="font-semibold">{escapeHtml(log.actor)}</td>
                      <td>
                        <span
                          className={`badge ${roleBadgeClass}`}
                          style={{ fontSize: "0.75rem", fontWeight: 500 }}
                        >
                          {log.role}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-3 text-secondary small">
          <span>
            Showing {filteredLogs.length} of {claimsDb.length} total entries
          </span>
          <span>Total Claims: {uniqueClaimIds.size}</span>
        </div>
      </div>

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
