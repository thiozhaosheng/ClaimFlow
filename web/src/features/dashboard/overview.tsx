"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ReceiptText, Clock, CheckCircle2, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useClaims } from "@/features/claims/api/queries";
import { ClaimRow } from "@/features/claims/components/claim-row";
import { Card } from "@/components/ui/card";
import { formatSGD } from "@/core/domain/money";

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-fg-tertiary">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-surface" />
      ) : (
        <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-fg">
          {value}
        </p>
      )}
      <p className="mt-1.5 text-xs text-fg-tertiary">{sub}</p>
    </Card>
  );
}

export function DashboardOverview() {
  const { data, isLoading } = useClaims();

  const stats = useMemo(() => {
    const rows = data ?? [];
    const sum = (s: string) =>
      rows.filter((c) => c.status === s).reduce((a, c) => a + c.amount, 0);
    return {
      total: rows.length,
      pending: rows.filter((c) => c.status === "Pending").length,
      endorsed: rows.filter((c) => c.status === "Endorsed").length,
      paidAmount: sum("Paid"),
    };
  }, [data]);

  const recent = (data ?? []).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={ReceiptText}
          label="Total claims"
          value={String(stats.total)}
          sub="In your workspace"
          loading={isLoading}
        />
        <Stat
          icon={Clock}
          label="Pending"
          value={String(stats.pending)}
          sub="Awaiting manager approval"
          loading={isLoading}
        />
        <Stat
          icon={CheckCircle2}
          label="Endorsed"
          value={String(stats.endorsed)}
          sub="Queued for finance"
          loading={isLoading}
        />
        <Stat
          icon={Wallet}
          label="Paid out"
          value={formatSGD(stats.paidAmount)}
          sub="Disbursed via GIRO/PayNow"
          loading={isLoading}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">Recent claims</h2>
          <Link
            href="/claims"
            className="text-xs font-medium text-accent hover:underline"
          >
            View all
          </Link>
        </div>
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[60px] animate-pulse border-b border-border bg-surface/40 last:border-0" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((c) => (
              <li key={c.id}>
                <ClaimRow claim={c} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
