import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import SortHeader from "../components/sortheader.jsx";
import TablePager from "../components/tablepager.jsx";
import RangeFilters, { EMPTY_RANGE, withinRange } from "../components/rangefilters.jsx";
import { useSort } from "../hooks/usesort.js";
import { usePaging } from "../hooks/usepaging.js";
import { useClaims } from "../hooks/useclaims.js";
import { useShortcuts } from "../hooks/useShortcuts.js";
import { escapeHtml, formatSGD } from "../utils/helpers.js";
import PageHeader from "../components/pageheader.jsx";
import EmptyState from "../components/emptystate.jsx";
import { exportAuditLogToCsv } from "../utils/export.js";
import ClaimDetailModal from "../components/claimdetailmodal.jsx";
import FinanceDashboard from "../components/financedashboard.jsx";
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
  const { claimsDb, latestMap, error, loading } = useClaims();
  const [activeTab, setActiveTab] = useState(session?.financeTab || "dashboard");
  const [searchAudit, setSearchAudit] = useState("");
  const [auditFilter, setAuditFilter] = useState("All");
  const [activeClaim, setActiveClaim] = useState(null);

  useShortcuts({
    onSearch: () => {
      document.getElementById("finance-search-input")?.focus();
    }
  });

  const switchTab = (tabKey) => {
    setActiveTab(tabKey);
    setFinanceTab(tabKey);
  };

  const [auditRange, setAuditRange] = useState(EMPTY_RANGE);

  const filteredLogs = claimsDb.filter((log) => {
    if (!withinRange(auditRange, { date: log.date, amount: log.amount })) return false;
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

  // 341 entries in one order was the whole audit trail. Finance chases the
  // largest disbursements and reads the newest first; both are one click now.
  const AUDIT_COLUMNS = useMemo(
    () => ({
      when: (l) => `${l.date} ${l.time}`,
      id: (l) => l.id,
      employee: (l) => l.employee,
      amount: (l) => Number(l.amount),
      action: (l) => l.action,
      actor: (l) => l.actor,
    }),
    [],
  );
  const auditSort = useSort(filteredLogs, AUDIT_COLUMNS, "when");
  const auditPaging = usePaging(auditSort.rows, 25);

  const uniqueClaimIds = new Set(claimsDb.map((c) => c.id));

  const exportCsv = () => {
    // The date and amount ranges count as filters too. Without them here, a
    // finance admin who narrowed the log to "over S$1,000 in July" and hit
    // Export would have been handed all 341 rows, named "full", with nothing
    // on screen to say the export ignored what they had set.
    const hasActiveFilter =
      auditFilter !== "All" ||
      searchAudit.trim().length > 0 ||
      auditRange.from !== "" ||
      auditRange.to !== "" ||
      auditRange.min !== "" ||
      auditRange.max !== "";
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
        className={`finance-audit w-full ${activeTab !== "audit" ? "hidden" : ""}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-4">
          <div>
            <h2 className="fin-section-title">Audit trail and export</h2>
            <p className="fin-section-sub">
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
            <RangeFilters value={auditRange} onChange={setAuditRange} />
          </div>
          <div
            className="search-input-wrapper m-0 w-full sm:w-auto"
            style={{ maxWidth: "400px" }}
          >
            <Search className="h-3.5 w-3.5 search-leading-icon" />
            <input
              id="finance-search-input"
              type="search"
              className="form-control"
              placeholder="Search by claim ID, employee, or actor…"
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
            />
          </div>
        </div>

        {/* The ledger sits in a data panel joined to the toolbar above it, and
            scrolls inside itself. That is what makes .data-table's sticky
            header useful: the column names stay put while 20,000px of log
            passes under them, instead of the whole workspace scrolling away. */}
        <div className="data-panel rounded-t-none border-t-0">
          <div className="data-panel-scroll finance-audit-scroll">
            <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Timestamp" sortKey="when" state={auditSort} />
                <SortHeader label="Claim ID" sortKey="id" state={auditSort} />
                <SortHeader label="Employee" sortKey="employee" state={auditSort} />
                <SortHeader label="Amount" sortKey="amount" state={auditSort} className="num" />
                <SortHeader label="Action" sortKey="action" state={auditSort} />
                <SortHeader label="Actor" sortKey="actor" state={auditSort} />
                <th scope="col">Role</th>
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
                auditPaging.rows.map((log, idx) => (
                  <tr
                    key={`${log.id}-${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveClaim(log)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveClaim(log);
                      }
                    }}
                  >
                    <td data-label="Timestamp" className="fin-audit-time">
                      {log.date}
                      <span className="fin-audit-clock">{log.time}</span>
                    </td>
                    <td data-label="Claim">
                      <span className="data-ref">{log.id}</span>
                      <span className="fin-audit-sub">
                        {escapeHtml(log.type)}
                      </span>
                    </td>
                    <td data-label="Employee">{escapeHtml(log.employee)}</td>
                    <td data-label="Amount" className="num">
                      {formatSGD(log.amount)}
                    </td>
                    <td data-label="Action">{escapeHtml(log.action)}</td>
                    <td data-label="Actor">{escapeHtml(log.actor)}</td>
                    <td data-label="Role">
                      {/* The role is a fact about who acted, not a status —
                          one neutral chip, no colour spent on it. */}
                      <span className="fin-audit-role">{log.role}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>

        {/* The range being viewed, how to move, and — when a filter is
            narrowing things — what the log holds in total, so a filtered view
            is never mistaken for the whole trail. */}
        <TablePager paging={auditPaging} noun="entries" />

        <div className="fin-audit-foot">
          <span>
            {filteredLogs.length === claimsDb.length
              ? `${claimsDb.length} entries in the log`
              : `Filtered from ${claimsDb.length} entries in the log`}
          </span>
          <span>Total claims: {uniqueClaimIds.size}</span>
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
