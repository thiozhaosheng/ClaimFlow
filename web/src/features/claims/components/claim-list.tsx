"use client";

import { useMemo, useState } from "react";
import { 
  AlertTriangle, 
  Inbox, 
  Search, 
  LayoutGrid, 
  List, 
  Download, 
  Calendar, 
  Filter, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  ShieldAlert,
  Loader2,
  ChevronRight,
  TrendingUp,
  Coins
} from "lucide-react";
import type { Claim, ClaimStatus } from "@/core/domain/types";
import { useClaims } from "@/features/claims/api/queries";
import { ClaimRow } from "./claim-row";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "motion/react";
import { useSession } from "@/lib/session-context";
import { formatSGD } from "@/core/domain/money";
import { formatDate } from "@/core/domain/dates";
import Link from "next/link";
import { getEmployeeAvatar } from "@/core/domain/avatars";
import { InteractiveFlipCard } from "@/components/ui/interactive-flip-card";

const STATUS_FILTERS: Array<{ label: string; value: "All" | ClaimStatus }> = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Endorsed", value: "Endorsed" },
  { label: "Paid", value: "Paid" },
  { label: "Rejected", value: "Rejected" },
];

export function ClaimList() {
  const { data, isLoading, isError, refetch } = useClaims();
  const [statusFilter, setStatusFilter] = useState<"All" | ClaimStatus>("All");
  const [dateFilter, setDateFilter] = useState<"All" | "Month" | "Quarter">("All");
  const [amountFilter, setAmountFilter] = useState<"All" | "Under100" | "100to500" | "Over500">("All");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [exporting, setExporting] = useState(false);
  const { user } = useSession();

  // Process data based on active filters and active role
  const allRoleClaims = useMemo(() => {
    let rows = data ?? [];
    if (user?.role === "Employee") {
      rows = rows.filter((c) => c.employee === "Sarah Tan" || c.employee === user.name);
    } else if (user?.role === "Approving Officer") {
      rows = rows.filter((c) => c.department === user.department);
    }
    return rows;
  }, [data, user]);

  const filteredClaims = useMemo(() => {
    let rows = [...allRoleClaims];

    // Status filter
    if (statusFilter !== "All") {
      rows = rows.filter((c) => c.status === statusFilter);
    }

    // Date filter
    const now = new Date();
    if (dateFilter === "Month") {
      // Filter claims filed in the last 30 days
      rows = rows.filter((c) => {
        const d = new Date(c.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 30;
      });
    } else if (dateFilter === "Quarter") {
      // Last 90 days
      rows = rows.filter((c) => {
        const d = new Date(c.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 90;
      });
    }

    // Amount filter
    if (amountFilter === "Under100") {
      rows = rows.filter((c) => c.amount < 100);
    } else if (amountFilter === "100to500") {
      rows = rows.filter((c) => c.amount >= 100 && c.amount <= 500);
    } else if (amountFilter === "Over500") {
      rows = rows.filter((c) => c.amount > 500);
    }

    // Text search query
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        `${c.title} ${c.employee} ${c.type} ${c.id}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [allRoleClaims, statusFilter, dateFilter, amountFilter, query]);

  // Aggregate metrics summary cards
  const metrics = useMemo(() => {
    const totalCount = allRoleClaims.length;
    const totalAmount = allRoleClaims.reduce((acc, c) => acc + c.amount, 0);
    const pendingCount = allRoleClaims.filter((c) => c.status === "Pending" || c.status === "Endorsed").length;
    const pendingAmount = allRoleClaims.filter((c) => c.status === "Pending" || c.status === "Endorsed").reduce((acc, c) => acc + c.amount, 0);
    const paidCount = allRoleClaims.filter((c) => c.status === "Paid").length;
    const paidAmount = allRoleClaims.filter((c) => c.status === "Paid").reduce((acc, c) => acc + c.amount, 0);
    const warningsCount = allRoleClaims.filter((c) => c.flagged).length;

    return {
      totalCount,
      totalAmount,
      pendingCount,
      pendingAmount,
      paidCount,
      paidAmount,
      warningsCount,
    };
  }, [allRoleClaims]);

  // Trigger simulated exports
  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert(`Successfully generated report for ${filteredClaims.length} items.\nFormat: CSV (ClaimFlow_Export.csv)`);
    }, 1500);
  };

  // Partition claims for Kanban Columns
  const boardColumns = useMemo(() => {
    const cols: Record<ClaimStatus, Claim[]> = {
      Pending: [],
      Endorsed: [],
      Paid: [],
      Rejected: [],
    };
    filteredClaims.forEach((c) => {
      if (cols[c.status]) {
        cols[c.status].push(c);
      }
    });
    return cols;
  }, [filteredClaims]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Dynamic Claims Metrics Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Submissions */}
        <div className="bg-white/40 dark:bg-black/15 backdrop-blur-md border border-white/20 dark:border-white/[0.05] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left select-none relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-fg-secondary">Total Submissions</span>
            <Coins className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-xl font-bold tracking-tight text-fg tabular-nums">{formatSGD(metrics.totalAmount)}</p>
            <span className="text-[10px] text-fg-secondary font-mono">{metrics.totalCount} filed</span>
          </div>
          <p className="mt-1.5 text-[10px] text-fg-tertiary font-medium">All historical claims in database</p>
        </div>

        {/* Awaiting Settlement */}
        <div className="bg-white/40 dark:bg-black/15 backdrop-blur-md border border-white/20 dark:border-white/[0.05] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left select-none relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-fg-secondary">Awaiting Settlement</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-xl font-bold tracking-tight text-fg tabular-nums">{formatSGD(metrics.pendingAmount)}</p>
            <span className="text-[10px] text-fg-secondary font-mono">{metrics.pendingCount} pending</span>
          </div>
          <p className="mt-1.5 text-[10px] text-fg-tertiary font-medium">Pending Manager &amp; FAST clearances</p>
        </div>

        {/* Paid / Reimbursed */}
        <div className="bg-white/40 dark:bg-black/15 backdrop-blur-md border border-white/20 dark:border-white/[0.05] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left select-none relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-fg-secondary">Paid / Reimbursed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-xl font-bold tracking-tight text-fg tabular-nums">{formatSGD(metrics.paidAmount)}</p>
            <span className="text-[10px] text-fg-secondary font-mono">{metrics.paidCount} cleared</span>
          </div>
          <p className="mt-1.5 text-[10px] text-fg-tertiary font-medium">Disbursed to bank account</p>
        </div>

        {/* Compliance Warning Flags */}
        <div className="bg-white/40 dark:bg-black/15 backdrop-blur-md border border-white/20 dark:border-white/[0.05] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left select-none relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-fg-secondary">Audit Warnings</span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-500 tabular-nums">{metrics.warningsCount}</p>
            <span className="text-[10px] text-fg-secondary font-mono">Flagged policy</span>
          </div>
          <p className="mt-1.5 text-[10px] text-fg-tertiary font-medium">Flagged items require manual audit review</p>
        </div>
      </div>

      {/* 2. Interactive Control Bar (Search, Filters, View Modes, Exporters) */}
      <InteractiveFlipCard
        title="Interactive Ledger Filters"
        backContent="This control bar allows you to search claims instantly by merchant name, employee name, or description. Filter items by status tab, date ranges, or amount brackets. Toggle layout between a list and a Kanban board, and export reports directly."
        layout="horizontal"
      >
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-left w-full h-full">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tab buttons */}
          <div className="flex bg-surface border border-border rounded-lg p-0.5" role="tablist">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  statusFilter === f.value
                    ? "bg-card text-fg shadow-sm border border-border"
                    : "text-fg-tertiary hover:text-fg-secondary"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Date range filter selector */}
          <div className="relative shrink-0 flex items-center bg-surface border border-border rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase text-fg-secondary select-none">
            <Calendar className="h-3.5 w-3.5 mr-1 text-fg-tertiary" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as "All" | "Month" | "Quarter")}
              className="bg-transparent focus:outline-none cursor-pointer pr-4 appearance-none font-sans font-bold"
            >
              <option value="All">All Dates</option>
              <option value="Month">Last 30 Days</option>
              <option value="Quarter">Last 90 Days</option>
            </select>
            <span className="ml-1 pointer-events-none text-fg-tertiary text-[8px]">&darr;</span>
          </div>

          {/* Amount range filter selector */}
          <div className="relative shrink-0 flex items-center bg-surface border border-border rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase text-fg-secondary select-none">
            <Filter className="h-3.5 w-3.5 mr-1 text-fg-tertiary" />
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value as "All" | "Under100" | "100to500" | "Over500")}
              className="bg-transparent focus:outline-none cursor-pointer pr-4 appearance-none font-sans font-bold"
            >
              <option value="All">All Amounts</option>
              <option value="Under100">Under S$100</option>
              <option value="100to500">S$100 - S$500</option>
              <option value="Over500">Over S$500</option>
            </select>
            <span className="ml-1 pointer-events-none text-fg-tertiary text-[8px]">&darr;</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Query search Input */}
          <label className="relative flex w-full md:w-56 items-center shrink-0">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-fg-tertiary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search claims…"
              className="h-8.5 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-xs placeholder:text-fg-tertiary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/15"
            />
          </label>

          {/* View Mode layout switches */}
          <div className="flex bg-surface border border-border rounded-lg p-0.5 shrink-0" role="tablist">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded cursor-pointer transition-all",
                viewMode === "list" ? "bg-card text-accent border border-border shadow-sm" : "text-fg-tertiary hover:text-fg"
              )}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={cn(
                "p-1.5 rounded cursor-pointer transition-all",
                viewMode === "board" ? "bg-card text-accent border border-border shadow-sm" : "text-fg-tertiary hover:text-fg"
              )}
              title="Kanban Board View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Export Report Trigger */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-fg hover:opacity-90 text-canvas font-bold rounded-lg px-2.5 h-8.5 text-[10px] uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 active:scale-[0.98] transition-transform cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Export
              </>
            )}
          </button>
        </div>
      </div>
      </InteractiveFlipCard>

      {/* 3. Claims Data Views (Flat List vs Kanban Workflow Board) */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-2.5"
          aria-busy
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[62px] animate-pulse rounded-xl border border-border bg-card/30 dark:bg-card/15"
            />
          ))}
        </motion.div>
      )}

      {isError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/45 dark:bg-card/25 backdrop-blur-3xl saturate-210 p-10 text-center shadow-sm"
        >
          <AlertTriangle className="h-6 w-6 text-danger" />
          <div>
            <p className="font-semibold">Couldn’t load claims repository</p>
            <p className="text-xs text-fg-secondary">Please verify database connectivity.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg hover:bg-accent-hover"
          >
            Retry Sync
          </button>
        </motion.div>
      )}

      {!isLoading && !isError && filteredClaims.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/45 dark:bg-card/25 backdrop-blur-3xl saturate-210 p-12 text-center shadow-sm"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-fg-tertiary">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-sm">No matching claims in repository</p>
            <p className="text-xs text-fg-secondary">
              Try adjusting your date filters or search parameters.
            </p>
          </div>
        </motion.div>
      )}

      {!isLoading && !isError && filteredClaims.length > 0 && (
        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
            /* Flat List view */
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden rounded-xl border border-border bg-card/45 dark:bg-card/25 backdrop-blur-3xl shadow-sm text-left"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
                  File Repository ({filteredClaims.length} entries)
                </span>
              </div>
              <motion.ul
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.03 }
                  }
                }}
                initial="hidden"
                animate="show"
                className="divide-y divide-border"
              >
                {filteredClaims.map((c) => (
                  <motion.li
                    key={c.id}
                    variants={{
                      hidden: { opacity: 0, y: 5 },
                      show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
                    }}
                  >
                    <ClaimRow claim={c} />
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          ) : (
            /* Kanban Workflow Board view */
            <motion.div
              key="board-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {(["Pending", "Endorsed", "Paid", "Rejected"] as const).map((status) => {
                const columnClaims = boardColumns[status] || [];
                const columnColors = {
                  Pending: "border-t-amber-500 bg-amber-500/[0.01]",
                  Endorsed: "border-t-indigo-500 bg-indigo-500/[0.01]",
                  Paid: "border-t-emerald-500 bg-emerald-500/[0.01]",
                  Rejected: "border-t-rose-500 bg-rose-500/[0.01]",
                }[status];

                const columnBadge = {
                  Pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                  Endorsed: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
                  Paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                  Rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-450 border-rose-500/20",
                }[status];

                return (
                  <div 
                    key={status} 
                    className={cn(
                      "rounded-xl border border-border border-t-[3.5px] p-3 text-left flex flex-col gap-3 min-h-[400px] shadow-sm bg-card",
                      columnColors
                    )}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between border-b border-border/80 pb-2">
                      <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                        {status === "Pending" && <Clock className="h-3.5 w-3.5 text-amber-500" />}
                        {status === "Endorsed" && <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />}
                        {status === "Paid" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        {status === "Rejected" && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                        {status}
                      </span>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono", columnBadge)}>
                        {columnClaims.length}
                      </span>
                    </div>

                    {/* Column Scrollable Cards */}
                    <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[500px] pr-0.5">
                      {columnClaims.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center py-10 text-[10px] text-fg-tertiary select-none">
                          No items
                        </div>
                      ) : (
                        columnClaims.map((claim) => (
                          <Link
                            key={claim.id}
                            href={`/claims/${claim.id}`}
                            className={cn(
                              "block p-3 rounded-lg border border-border bg-card/60 dark:bg-zinc-950/20 hover:border-accent hover:shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all cursor-pointer select-none active:scale-[0.98]",
                              claim.flagged ? "border-l-[3.5px] border-l-rose-500 bg-rose-500/[0.015] dark:bg-rose-500/[0.01] pl-2" : ""
                            )}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-mono text-[9px] text-fg-tertiary font-bold">{claim.id}</span>
                              <span className="text-[10px] font-bold tabular-nums text-fg">{formatSGD(claim.amount)}</span>
                            </div>
                            <h4 className="text-xs font-semibold text-fg mt-1 truncate">{claim.title}</h4>
                            <p className="text-[9px] text-fg-tertiary mt-1 font-medium">{formatDate(claim.date)}</p>

                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
                              {/* Horizontal progress bar */}
                              <div className="flex items-center gap-1">
                                <div className="w-8 h-1 bg-zinc-150 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                                  <div 
                                    className={cn("h-full rounded-full", claim.flagged ? "bg-rose-500" : "bg-emerald-500")} 
                                    style={{ width: claim.flagged ? "75%" : "100%" }}
                                  />
                                </div>
                                <span className={cn("text-[9px] font-bold font-mono tracking-tighter tabular-nums", claim.flagged ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-500")}>
                                  {claim.flagged ? "75%" : "100%"}
                                </span>
                              </div>

                              {/* Claimant avatar */}
                              {user?.role !== "Employee" && (
                                <div className="flex items-center gap-1 bg-surface-strong border border-border rounded-full py-0.5 pl-1 pr-2 text-[9px] text-fg-secondary">
                                  <img 
                                    src={getEmployeeAvatar(claim.employee)} 
                                    alt={claim.employee} 
                                    className="h-3.5 w-3.5 rounded-full object-cover shrink-0"
                                  />
                                  <span className="truncate max-w-[45px] font-bold">{claim.employee.split(" ")[0]}</span>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
