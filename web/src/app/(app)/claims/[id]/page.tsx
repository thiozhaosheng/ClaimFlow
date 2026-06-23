"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Check,
  X,
} from "lucide-react";
import { useClaim, useClaimActivity } from "@/features/claims/api/queries";
import {
  deriveStages,
  deriveRequirements,
  requirementsSummary,
} from "@/core/domain/claim-progress";
import { evaluatePolicies, claimContextFromForm } from "@/core/domain/policy/engine";
import { CATEGORY_FIELDS } from "@/core/domain/categories";
import { formatSGD } from "@/core/domain/money";
import { formatDate } from "@/core/domain/dates";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Button } from "@/components/ui/button";
import { StageTracker } from "@/features/claims/components/stage-tracker";
import { RequirementsList } from "@/features/claims/components/requirements-list";
import { cn } from "@/lib/cn";

const SUMMARY_LABEL = {
  complete: "All clear",
  missing: "Action needed",
  blocked: "Blocked",
  review: "Under review",
} as const;

const SUMMARY_TONE = {
  complete: "bg-success-bg text-success-fg",
  missing: "bg-warning-bg text-warning-fg",
  blocked: "bg-danger-bg text-danger-fg",
  review: "bg-accent-subtle text-accent",
} as const;

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: claim, isLoading } = useClaim(id);
  const { data: activity = [] } = useClaimActivity(id);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const stages = useMemo(() => (claim ? deriveStages(claim) : []), [claim]);
  const requirements = useMemo(
    () => (claim ? deriveRequirements(claim) : []),
    [claim],
  );
  const summary = requirementsSummary(requirements);
  const policy = useMemo(
    () =>
      claim
        ? evaluatePolicies(
            claimContextFromForm({
              category: claim.type,
              amount: claim.amount,
              receiptUrl: claim.receiptUrl,
              expenseDate: claim.date,
              details: claim.details,
            }),
          )
        : null,
    [claim],
  );

  const spec = claim ? CATEGORY_FIELDS[claim.type] : undefined;
  const detailEntries = spec?.fields
    .map((f) => ({ label: f.label, value: claim?.details?.[f.key] }))
    .filter((e) => e.value !== undefined && e.value !== null && e.value !== "");

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />;
  }

  if (!claim) {
    return (
      <Card className="p-10 text-center">
        <FileText className="mx-auto mb-3 h-8 w-8 text-fg-tertiary" />
        <p className="font-semibold">Claim not found</p>
        <p className="mb-4 text-sm text-fg-secondary">
          We couldn’t find <code>{id}</code>.
        </p>
        <Button asChild variant="secondary">
          <Link href="/claims">Back to claims</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href="/claims">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight">{claim.id}</h1>
        <StatusPill status={claim.status} />
        <div className="ml-auto">
          <Button size="sm" variant="secondary" onClick={() => setDrawerOpen(true)}>
            <UploadCloud className="h-4 w-4" />
            Upload documents
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* left: info */}
        <Card className="p-6 lg:col-span-1">
          <div className="mb-5 flex items-center gap-3">
            <CategoryIcon category={claim.type} className="h-11 w-11" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-fg-tertiary">
                {claim.type}
              </p>
              <p className="text-lg font-bold tabular-nums tracking-tight">
                {formatSGD(claim.amount)}
              </p>
            </div>
          </div>
          <dl className="flex flex-col">
            <InfoRow label="Title" value={claim.title} />
            <InfoRow label="Claimant" value={claim.employee} />
            <InfoRow label="Department" value={claim.department} />
            <InfoRow label="Expense date" value={formatDate(claim.date)} />
            {claim.merchant && <InfoRow label="Merchant" value={claim.merchant} />}
            {claim.gstAmount != null && (
              <InfoRow label="GST" value={formatSGD(claim.gstAmount)} />
            )}
            {claim.bank && <InfoRow label="Payout to" value={claim.bank} />}
          </dl>

          {detailEntries && detailEntries.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
                {spec?.label} details
              </p>
              <dl className="flex flex-col">
                {detailEntries.map((e) => (
                  <InfoRow key={e.label} label={e.label} value={String(e.value)} />
                ))}
              </dl>
            </div>
          )}
        </Card>

        {/* right: process + requirements */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold tracking-tight">
              Claim process
            </h2>
            <StageTracker stages={stages} />

            <p className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
              Activity
            </p>
            <ol className="flex flex-col gap-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-border-strong" />
                  <div>
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-fg-tertiary">
                      {a.actor} · {a.role} · {a.date} {a.time}
                    </p>
                    {a.reason && (
                      <p className="mt-1 text-xs italic text-fg-secondary">{a.reason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">
                Documents &amp; requirements
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  SUMMARY_TONE[summary],
                )}
              >
                {SUMMARY_LABEL[summary]}
              </span>
            </div>
            <RequirementsList
              requirements={requirements}
              onUpload={() => setDrawerOpen(true)}
            />
            {policy && (
              <div className="mt-4 rounded-xl border border-border bg-surface p-3 text-sm">
                <span className="font-semibold">
                  {policy.outcome === "auto-approve"
                    ? "Meets every auto-approval check"
                    : policy.outcome === "block"
                      ? "Blocked by policy"
                      : "Routed for review"}
                </span>{" "}
                <span className="font-mono text-xs text-fg-tertiary">{policy.ruleId}</span>
                <p className="mt-0.5 text-fg-secondary">{policy.message}</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <UploadDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        requirements={requirements}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="shrink-0 text-xs text-fg-tertiary">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-fg">
        {value}
      </dd>
    </div>
  );
}

function UploadDrawer({
  open,
  onOpenChange,
  requirements,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requirements: ReturnType<typeof deriveRequirements>;
}) {
  const [staged, setStaged] = useState<Record<string, boolean>>({});
  const outstanding = requirements.filter(
    (r) => r.canUpload || r.state === "missing",
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-pop focus:outline-none">
          <div className="flex h-14 items-center justify-between border-b border-border px-5">
            <Dialog.Title className="text-base font-semibold">
              Upload documents
            </Dialog.Title>
            <Dialog.Close className="grid h-8 w-8 place-items-center rounded-lg text-fg-secondary hover:bg-surface">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="px-5 pt-4 text-sm text-fg-secondary">
            Attach what this claim still needs — it updates the checklist live.
          </Dialog.Description>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
            {outstanding.length === 0 ? (
              <div className="grid place-items-center gap-2 py-10 text-center text-sm text-fg-tertiary">
                <Check className="h-6 w-6 text-success" />
                Nothing outstanding — all documents are in.
              </div>
            ) : (
              outstanding.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-fg-tertiary">{r.detail}</p>
                  </div>
                  {staged[r.key] ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-fg">
                      <Check className="h-3.5 w-3.5" /> Added
                    </span>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent/30 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent-subtle">
                      <UploadCloud className="h-3.5 w-3.5" />
                      Choose file
                      <input
                        type="file"
                        className="hidden"
                        onChange={() =>
                          setStaged((s) => ({ ...s, [r.key]: true }))
                        }
                      />
                    </label>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end border-t border-border p-4">
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
