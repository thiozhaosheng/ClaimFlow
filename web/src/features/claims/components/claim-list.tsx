"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Inbox, Search } from "lucide-react";
import type { ClaimStatus } from "@/core/domain/types";
import { useClaims } from "@/features/claims/api/queries";
import { ClaimRow } from "./claim-row";
import { cn } from "@/lib/cn";

const FILTERS: Array<{ label: string; value: "All" | ClaimStatus }> = [
  { label: "All", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Endorsed", value: "Endorsed" },
  { label: "Paid", value: "Paid" },
  { label: "Rejected", value: "Rejected" },
];

export function ClaimList() {
  const { data, isLoading, isError, refetch } = useClaims();
  const [filter, setFilter] = useState<"All" | ClaimStatus>("All");
  const [query, setQuery] = useState("");

  const claims = useMemo(() => {
    let rows = data ?? [];
    if (filter !== "All") rows = rows.filter((c) => c.status === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        `${c.title} ${c.employee} ${c.type} ${c.id}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [data, filter, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f.value
                  ? "bg-fg text-canvas"
                  : "bg-card text-fg-secondary ring-1 ring-inset ring-border hover:bg-surface",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative ml-auto flex w-full max-w-xs items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-fg-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search claims…"
            className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm placeholder:text-fg-tertiary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          />
        </label>
      </div>

      {/* states */}
      {isLoading && (
        <div className="flex flex-col gap-2.5" aria-busy>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[74px] animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <AlertTriangle className="h-7 w-7 text-danger" />
          <div>
            <p className="font-semibold">Couldn’t load claims</p>
            <p className="text-sm text-fg-secondary">Please try again.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && claims.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-fg-tertiary">
            <Inbox className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold">No claims here</p>
            <p className="text-sm text-fg-secondary">
              Nothing matches your filters right now.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !isError && claims.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-tertiary">
              {claims.length} {claims.length === 1 ? "claim" : "claims"}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {claims.map((c) => (
              <li key={c.id}>
                <ClaimRow claim={c} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
