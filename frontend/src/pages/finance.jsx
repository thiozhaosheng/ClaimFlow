import { useState } from "react";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { useClaims } from "../hooks/useclaims.js";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import PageHeader from "../components/pageheader.jsx";
import EmptyState from "../components/emptystate.jsx";
import { exportAuditLogToCsv } from "../utils/export.js";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";
import FinanceDashboard from "../components/financedashboard.jsx";
import PolicyFlag from "../components/policyflag.jsx";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  Filter,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";

export default function Finance() {
  const { session, setFinanceTab } = useAuth();
  const { addToast } = useToast();
  const { claimsDb, latestMap, batchMarkAsPaid, error, loading } = useClaims();
  const [activeTab, setActiveTab] = useState(session?.financeTab || "dashboard");
  const [searchQueue, setSearchQueue] = useState("");
  const [searchAudit, setSearchAudit] = useState("");
  const [auditFilter, setAuditFilter] = useState("All");
  const [selectedClaims, setSelectedClaims] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [activeClaim, setActiveClaim] = useState(null);
  const [paying, setPaying] = useState(false);

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

  const handleMarkAsPaid = async () => {
    if (selectedClaims.size === 0 || paying) return;
    const count = selectedClaims.size;
    const totalAtClick = selectedTotal;
    setPaying(true);
    try {
      await batchMarkAsPaid(selectedClaims);
      addToast({
        variant: "success",
        title: `${count} claim${count === 1 ? "" : "s"} marked as paid`,
        message: `Total ${formatSGD(totalAtClick)} disbursed.`,
      });
      setSelectedClaims(new Set());
      setSelectAll(false);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Payment failed",
        message: err?.message || "Could not mark these claims as paid.",
      });
    } finally {
      setPaying(false);
    }
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
      <PageHeader
        eyebrow="Finance admin"
        title="Finance workspace"
        subtitle="See spend at a glance, disburse endorsed claims, and review the audit trail. GST 9% is captured per claim where applicable for IRAS reporting."
      />

      <div className="border-b border-border-subtle mb-6 -mt-3">
        <div
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
          role="tablist"
        >
          {[
            { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { key: "payment", label: "Payment queue", icon: Wallet },
            { key: "audit", label: "Audit trail", icon: ShieldCheck },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              className={`relative inline-flex shrink-0 items-center gap-1.5 px-3 h-9 text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? "text-foreground border-accent"
                  : "text-text-secondary border-transparent hover:text-foreground"
              }`}
              onClick={() => switchTab(key)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="data-error" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <strong>Could not load claims</strong>
            <span>{error.message}</span>
          </div>
        </div>
      )}

      {activeTab === "dashboard" && (
        <FinanceDashboard
          claims={Object.values(latestMap)}
          loading={loading}
        />
      )}

      <div
        className={`workspace-card p-6 ${activeTab !== "payment" ? "hidden" : ""}`}
      >
        <h2 className="workspace-card-title mb-0.5">
          Endorsed claims queue
        </h2>
        <p className="text-text-tertiary text-[12px] mb-4">
          Process endorsed claims for disbursement.
        </p>

        <div className="action-bar-strip flex flex-wrap justify-between items-center gap-3 p-3 border border-border-subtle rounded-ds-md mb-4">
          <div className="flex items-center gap-2">
            <div
              className="search-input-wrapper m-0"
              style={{ maxWidth: "280px" }}
            >
              <Search className="h-3.5 w-3.5 search-leading-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search by ID or employee name"
                value={searchQueue}
                onChange={(e) => setSearchQueue(e.target.value)}
              />
            </div>
            <button className="btn h-9 border border-border-subtle bg-card text-text-secondary hover:bg-subtle">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right leading-tight">
              <span className="text-text-tertiary text-[11px] block uppercase tracking-[0.05em]">
                Selected total
              </span>
              <span className="font-semibold text-[1.05rem] text-text-primary tabular-nums">
                {formatSGD(selectedTotal)}
              </span>
            </div>
            <button
              className="btn-mark-paid"
              disabled={selectedClaims.size === 0 || paying}
              onClick={handleMarkAsPaid}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                Mark as paid ({selectedClaims.size})
              </span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table align-middle">
            <thead>
              <tr>
                <th width="40" className="text-center">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all endorsed claims"
                  />
                </th>
                <th>CLAIM ID</th>
                <th>Employee</th>
                <th>Bank Account</th>
                <th className="text-right">Endorsed Amount</th>
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
                      data-label="Select"
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
                        aria-label={`Select claim ${item.id}`}
                      />
                    </td>
                    <td data-label="Claim">
                      <div className="flex items-center gap-2">
                        <strong className="text-text-primary">{item.id}</strong>
                        <PolicyFlag claim={item} variant="dot" />
                      </div>
                      <span className="text-text-secondary text-xs">{item.date}</span>
                    </td>
                    <td data-label="Employee">
                      <span className="font-semibold">
                        {escapeHtml(item.employee)}
                      </span>
                      <br />
                      <span className="text-text-secondary text-xs">
                        {item.department}
                      </span>
                    </td>
                    <td data-label="Bank">
                      <span className="badge-custom badge-role inline-flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-text-tertiary" />
                        {item.bank}
                      </span>
                    </td>
                    <td
                      data-label="Amount"
                      className="text-right font-bold text-text-primary"
                    >
                      {formatSGD(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={`workspace-card p-6 ${activeTab !== "audit" ? "hidden" : ""}`}
      >
        <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
          <div>
            <h2 className="workspace-card-title mb-0.5">
              Audit trail & export
            </h2>
            <p className="text-text-tertiary text-[12px]">
              Read-only log of all claim status changes and actions.
            </p>
          </div>
          <button
            className="btn-primary inline-flex items-center gap-1.5"
            onClick={exportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div
            className="search-input-wrapper m-0 flex-1"
            style={{ maxWidth: "500px" }}
          >
            <Search className="h-3.5 w-3.5 search-leading-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search by claim ID, employee, or actor…"
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

        <div className="overflow-x-auto">
          <table className="data-table align-middle">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Claim ID</th>
                <th>Employee</th>
                <th className="text-right">Amount</th>
                <th>Action</th>
                <th>Actor</th>
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
                  let roleBadgeClass =
                    "bg-subtle text-text-secondary border border-border-subtle";
                  if (log.role === "approving")
                    roleBadgeClass =
                      "text-accent bg-accent-subtle border border-transparent";
                  if (log.role === "finance")
                    roleBadgeClass =
                      "text-info-text bg-info-bg border border-transparent";

                  return (
                    <tr
                      key={`${log.id}-${idx}`}
                      className="row-clickable"
                      onClick={() => setActiveClaim(log)}
                    >
                      <td
                        data-label="Timestamp"
                        className="whitespace-nowrap text-text-secondary font-medium"
                      >
                        {log.date}{" "}
                        <span className="ml-1 text-text-tertiary text-xs font-normal">
                          {log.time}
                        </span>
                      </td>
                      <td data-label="Claim">
                        <span className="text-accent font-semibold">
                          {log.id}
                        </span>
                        <br />
                        <span className="text-text-tertiary text-xs">
                          {escapeHtml(log.type)}
                        </span>
                      </td>
                      <td data-label="Employee" className="font-medium">
                        {escapeHtml(log.employee)}
                      </td>
                      <td
                        data-label="Amount"
                        className="text-right font-bold text-text-primary"
                      >
                        {formatSGD(log.amount)}
                      </td>
                      <td data-label="Action">
                        <span className="text-text-primary font-medium">
                          {escapeHtml(log.action)}
                        </span>
                      </td>
                      <td data-label="Actor" className="font-semibold">
                        {escapeHtml(log.actor)}
                      </td>
                      <td data-label="Role">
                        <span
                          className={`badge-custom ${roleBadgeClass}`}
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

        <div className="flex justify-between items-center border-t border-border-subtle pt-3 mt-3 text-text-secondary text-xs">
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
