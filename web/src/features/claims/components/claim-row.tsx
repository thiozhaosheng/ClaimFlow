import Link from "next/link";
import { ChevronRight, Paperclip, Check, AlertTriangle } from "lucide-react";
import type { Claim } from "@/core/domain/types";
import { formatSGD } from "@/core/domain/money";
import { formatDate } from "@/core/domain/dates";
import { CategoryIcon } from "@/components/ui/category-icon";
import { StatusPill } from "@/components/ui/status-pill";
import { getEmployeeAvatar } from "@/core/domain/avatars";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/cn";
import { motion } from "motion/react";

export function ClaimRow({ claim, dense = false }: { claim: Claim; dense?: boolean }) {
  const { user } = useSession();
  const isEmployee = user?.role === "Employee";

  return (
    <Link
      href={`/claims/${claim.id}`}
      className={cn(
        "group flex items-center gap-4 px-4 py-2.5 border-l-[3.5px] focus-visible:bg-surface/50 focus-visible:outline-none hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.06),0_3px_6px_-3px_rgba(0,0,0,0.03)] hover:scale-[1.005] active:scale-[0.995] active:translate-y-0 transition-all duration-300 ease-out cursor-pointer",
        claim.flagged
          ? "bg-rose-500/[0.015] dark:bg-rose-500/[0.01] hover:bg-rose-500/[0.03] dark:hover:bg-rose-500/[0.02] border-rose-500/70"
          : "hover:bg-surface/50 dark:hover:bg-white/[0.02] border-transparent hover:border-accent/60"
      )}
    >
      <CategoryIcon category={claim.type} className="h-8 w-8 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="truncate text-sm font-semibold text-fg group-hover:text-accent transition-colors">{claim.title}</p>
          {claim.flagged && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded bg-rose-500/10 dark:bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Flagged
            </span>
          )}
        </div>
        <div className="truncate text-xs text-fg-tertiary flex items-center gap-1.5 mt-1 font-medium min-w-0 flex-wrap">
          <span className="font-mono text-[10px] bg-surface-strong px-1.5 py-0.5 rounded border border-border shrink-0">{claim.id}</span>
          <span className="shrink-0">·</span>
          <span className="truncate">{formatDate(claim.date)}</span>
          <span className="shrink-0">·</span>
          <div className="flex items-center gap-1.5 shrink-0 select-none" title={`Compliance Trust Score: ${claim.flagged ? "75%" : "100%"}`}>
            <span className="text-[9px] font-semibold text-fg-tertiary">Trust:</span>
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
        </div>
      </div>

      {/* Claimant Badge - visible on sm+ screens, or xl+ screens in dense mode */}
      {!isEmployee && (
        <div className={cn(
          "items-center gap-1.5 bg-surface-strong/60 border border-border rounded-full py-0.5 pl-1 pr-2.5 text-[11px] text-fg-secondary select-none shrink-0",
          dense ? "hidden xl:flex" : "hidden sm:flex"
        )}>
          <img
            src={getEmployeeAvatar(claim.employee)}
            alt={claim.employee}
            className="h-4.5 w-4.5 rounded-full object-cover shrink-0"
          />
          <span className="truncate font-semibold max-w-[80px]">{claim.employee.split(" ")[0]}</span>
        </div>
      )}

      {/* Redundant Category Badge - hidden completely in dense mode */}
      {!dense && (
        <span className="hidden w-36 shrink-0 text-xs font-bold uppercase tracking-wider text-fg-tertiary lg:block select-none">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-strong text-fg-secondary border border-border text-[10px] whitespace-nowrap truncate max-w-full" title={claim.type}>
            {claim.type}
          </span>
        </span>
      )}

      {claim.receiptUrl ? (
        <Paperclip
          className="hidden h-3.5 w-3.5 shrink-0 text-fg-tertiary sm:block"
          aria-label="Receipt attached"
        />
      ) : (
        <span className="hidden w-3.5 shrink-0 sm:block" aria-hidden />
      )}

      <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums tracking-tight text-fg">
        {formatSGD(claim.amount)}
      </span>

      <span className="w-[88px] shrink-0 text-right">
        <StatusPill status={claim.status} />
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-fg-tertiary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
    </Link>
  );
}
