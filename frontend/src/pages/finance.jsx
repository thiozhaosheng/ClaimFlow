import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { useClaims } from "../hooks/useclaims.js";
import { useShortcuts } from "../hooks/useShortcuts.js";
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
  ChevronRight,
  Download,
  Filter,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";

export default function Finance() {
  const navigate = useNavigate();
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

  useShortcuts({
    onSearch: () => {
      document.getElementById("finance-search-input")?.focus();
    }
  });

  const switchTab = (tabKey) => {
    setActiveTab(tabKey);
    setFinanceTab(tabKey);
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

      <div className="border-b border-border-subtle mb-6">
        <div
          className="flex items-center gap-1 max-lg:overflow-x-auto max-lg:pb-px no-scrollbar"
          role="tablist"
        >
          {[
            { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
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
        className={`w-full ${activeTab !== "audit" ? "hidden" : ""}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text-primary mb-1">
              Audit trail & export
            </h2>
            <p className="text-text-tertiary text-[13px]">
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

        <div className="data-toolbar">
          <div className="data-toolbar-filters">
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
          <div
            className="search-input-wrapper m-0 w-full sm:w-auto"
            style={{ maxWidth: "400px" }}
          >
            <Search className="h-3.5 w-3.5 search-leading-icon" />
            <input
              id="finance-search-input"
              type="text"
              className="form-control"
              placeholder="Search by claim ID, employee, or actor…"
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
            />
          </div>
        </div>

        <div className="workspace-card p-0 rounded-t-none border-t-0 overflow-x-auto">
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
