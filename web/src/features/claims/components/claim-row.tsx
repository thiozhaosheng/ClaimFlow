import Link from "next/link";
import { ChevronRight, Paperclip } from "lucide-react";
import type { Claim } from "@/core/domain/types";
import { formatSGD } from "@/core/domain/money";
import { formatDate } from "@/core/domain/dates";
import { CategoryIcon } from "@/components/ui/category-icon";
import { StatusPill } from "@/components/ui/status-pill";

/**
 * Dense list row (Linear/Ramp). No per-row card or shadow — rows live inside a
 * single container and are separated by hairlines, for information density.
 */
export function ClaimRow({ claim }: { claim: Claim }) {
  return (
    <Link
      href={`/claims/${claim.id}`}
      className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface/60 focus-visible:bg-surface/60 focus-visible:outline-none"
    >
      <CategoryIcon category={claim.type} className="h-9 w-9 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-fg">{claim.title}</p>
          {claim.flagged && (
            <span className="shrink-0 rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-fg">
              Flagged
            </span>
          )}
        </div>
        <p className="truncate text-xs text-fg-tertiary">
          <span className="font-mono">{claim.id}</span> · {claim.employee} ·{" "}
          {formatDate(claim.date)}
        </p>
      </div>

      <span className="hidden w-36 shrink-0 truncate text-xs text-fg-secondary lg:block">
        {claim.type}
      </span>

      {claim.receiptUrl ? (
        <Paperclip
          className="hidden h-3.5 w-3.5 shrink-0 text-fg-tertiary sm:block"
          aria-label="Receipt attached"
        />
      ) : (
        <span className="hidden w-3.5 shrink-0 sm:block" aria-hidden />
      )}

      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums tracking-tight text-fg">
        {formatSGD(claim.amount)}
      </span>

      <span className="w-[88px] shrink-0 text-right">
        <StatusPill status={claim.status} />
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-fg-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
