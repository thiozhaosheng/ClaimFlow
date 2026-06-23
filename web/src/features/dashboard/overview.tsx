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
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-tertiary">
          {label}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-subtle text-accent">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {loading ? (
        <div className="h-7 w-20 animate-pulse rounded bg-surface" />
      ) : (
        <p className="text-2xl font-bold tracking-tight tabular-nums text-fg">
          {value}
        </p>
      )}
      <p className="mt-1 text-xs text-fg-secondary">{sub}</p>
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
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Recent claims</h2>
          <Link
            href="/claims"
            className="text-sm font-medium text-accent hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="flex flex-col gap-2.5 px-5 pb-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[74px] animate-pulse rounded-2xl bg-surface"
                />
              ))
            : recent.map((c) => <ClaimRow key={c.id} claim={c} />)}
        </div>
      </Card>
    </div>
  );
}
