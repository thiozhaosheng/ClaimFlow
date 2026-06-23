import Link from "next/link";
import { ChevronRight, Paperclip } from "lucide-react";
import type { Claim } from "@/core/domain/types";
import { formatSGD } from "@/core/domain/money";
import { formatDate } from "@/core/domain/dates";
import { CategoryIcon } from "@/components/ui/category-icon";
import { StatusPill } from "@/components/ui/status-pill";

/** Decoupled, floating list row — replaces tabular rows. */
export function ClaimRow({ claim }: { claim: Claim }) {
  return (
    <Link
      href={`/claims/${claim.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <CategoryIcon category={claim.type} className="h-10 w-10 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-fg">{claim.title}</p>
          {claim.flagged && (
            <span className="rounded-full bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold text-warning-fg ring-1 ring-inset ring-warning/20">
              Flagged
            </span>
          )}
        </div>
        <p className="truncate text-xs text-fg-tertiary tabular-nums">
          {claim.id} · {claim.employee} · {claim.type} · {formatDate(claim.date)}
        </p>
      </div>

      {claim.receiptUrl && (
        <span className="hidden items-center gap-1 rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-medium text-accent md:inline-flex">
          <Paperclip className="h-3 w-3" />
          Receipt
        </span>
      )}

      <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums tracking-tight text-fg">
        {formatSGD(claim.amount)}
      </span>

      <StatusPill status={claim.status} className="shrink-0" />

      <ChevronRight className="h-4 w-4 shrink-0 text-fg-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
