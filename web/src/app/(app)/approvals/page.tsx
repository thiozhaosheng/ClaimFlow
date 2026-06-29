"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useClaims, useUpdateClaimStatus } from "@/features/claims/api/queries";
import { formatSGD } from "@/core/domain/money";
import { formatDate } from "@/core/domain/dates";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Check, X, ArrowRight, AlertTriangle } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { motion, AnimatePresence } from "motion/react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/cn";
import { evaluatePolicies, claimContextFromForm } from "@/core/domain/policy/engine";

export default function ApprovalsPage() {
  const { user, switchRole } = useSession();
  const { data: claims = [], isLoading } = useClaims();
  const updateStatus = useUpdateClaimStatus();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    document.title = "Approvals Queue & Review | ClaimFlow";
  }, []);

  const pendingClaims = useMemo(() => {
    return claims.filter(
      (c) => c.status === "Pending" && c.department === user?.department && c.employee !== user?.name
    );
  }, [claims, user]);

  if (user?.role !== "Approving Officer") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-[2rem] border border-white/20 dark:border-white/10 glass-panel shadow-[0_8px_32px_0_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.05)] p-8 text-center"
        >
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-fg mb-2">Restricted Access</h2>
          <p className="text-sm text-fg-secondary mb-6 leading-relaxed">
            The Approvals page is reserved for <strong className="text-fg font-bold">Approving Officers</strong> to review, reject, or endorse departmental claims.
          </p>
          <div className="flex flex-col gap-2.5">
            <Button
              className="bg-accent text-accent-fg hover:bg-accent-hover font-bold shadow-sm w-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              onClick={() => switchRole("Approving Officer")}
            >
              Switch to Approving Officer (Marcus)
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Review Pipeline"
        title="Approvals Queue"
        subtitle="Review, audit compliance indicators, and endorse or reject pending claims."
      />

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-card/40" />
            ))}
          </div>
        ) : pendingClaims.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid place-items-center rounded-2xl border border-dashed border-border-strong bg-card/50 p-16 text-center text-sm text-fg-secondary shadow-sm"
          >
            <div className="h-10 w-10 rounded-full bg-success/10 text-success flex items-center justify-center mb-3">
              <Check className="h-5 w-5" />
            </div>
            <p className="font-semibold text-fg">Approvals queue is clear!</p>
            <p className="text-xs text-fg-tertiary mt-1">No claims require approval at the moment.</p>
          </motion.div>
        ) : (
          <div id="approvals-pending-table" className="overflow-hidden rounded-2xl border border-border bg-card/45 dark:bg-card/25 backdrop-blur-xl saturate-180 shadow-card flex flex-col sm:h-[calc(100vh-275px)] h-auto min-h-[250px]">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-white/30 dark:bg-black/10 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-tertiary">
                {pendingClaims.length} pending review
              </span>
            </div>
            <ul className="divide-y divide-border overflow-y-auto flex-1">
              <AnimatePresence initial={false}>
                {pendingClaims.map((c) => {
                  const policyResult = evaluatePolicies(
                    claimContextFromForm({
                      category: c.type,
                      amount: c.amount,
                      receiptUrl: c.receiptUrl,
                      expenseDate: c.date,
                      details: c.details,
                    })
                  );

                  return (
                    <motion.li
                      layout
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: "auto", scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.9, padding: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      key={c.id}
                      className={cn(
                        "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors border-l-[3.5px]",
                        c.flagged
                          ? "bg-rose-500/[0.015] dark:bg-rose-500/[0.01] hover:bg-rose-500/[0.03] dark:hover:bg-rose-500/[0.02] border-rose-500"
                          : "hover:bg-white/10 dark:hover:bg-white/[0.01] border-transparent"
                      )}
                    >
                      <Link href={`/claims/${c.id}`} className="flex items-start gap-3.5 min-w-0 flex-1 group">
                        <CategoryIcon category={c.type} className="h-10 w-10 shrink-0 mt-0.5" />
                        <div className="min-w-0 leading-tight">
                          <div className="text-sm font-bold text-fg group-hover:text-accent transition-colors flex flex-wrap items-center gap-2">
                            {c.flagged && <AlertTriangle className="h-4 w-4 text-rose-500 dark:text-rose-400 animate-pulse shrink-0" />}
                            <span>{c.title}</span>
                            <span className="text-[10px] font-bold font-mono text-fg-tertiary bg-surface px-1.5 py-0.5 rounded border border-border">
                              {c.id}
                            </span>
                            {c.flagged && (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded bg-rose-500/10 dark:bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="h-3 w-3 text-rose-500 dark:text-rose-400 animate-pulse shrink-0" />
                                Flagged
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-fg-secondary mt-1.5 font-medium">
                            By {c.employee} · {c.department} · {formatDate(c.date)}
                          </div>
                          
                          {policyResult && policyResult.outcome !== "auto-approve" && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 select-none leading-none items-center animate-scale-in">
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Triggered Rule: {policyResult.ruleId}
                              </span>
                              <span className="text-[10px] text-fg-secondary font-medium truncate max-w-[280px]" title={policyResult.message}>
                                {policyResult.message}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-black text-fg tabular-nums mr-2">
                          {formatSGD(c.amount)}
                        </span>

                        {rejectingId === c.id ? (
                          <div className="flex items-center gap-1.5 animate-scale-in">
                            <input
                              type="text"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Rejection reason..."
                              className="h-8 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:border-red-500"
                            />
                            <Button
                              size="sm"
                              variant="danger"
                              className="h-8 px-2.5 rounded-lg text-xs cursor-pointer"
                              onClick={() => {
                                if (!reason) return;
                                updateStatus.mutate({
                                  id: c.id,
                                  status: "Rejected",
                                  actorName: user.name,
                                  actorRole: user.role,
                                  reason: reason,
                                });
                                setRejectingId(null);
                                setReason("");
                              }}
                            >
                              Confirm
                            </Button>
                            <button
                              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface text-fg-secondary cursor-pointer"
                              onClick={() => {
                                if (rejectingId === c.id) {
                                  setRejectingId(null);
                                }
                                setReason("");
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-8 px-3 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-0.5 cursor-pointer shadow-sm active:scale-95 transition-transform"
                              onClick={() => {
                                updateStatus.mutate({
                                  id: c.id,
                                  status: "Endorsed",
                                  actorName: user.name,
                                  actorRole: user.role,
                                });
                              }}
                              disabled={updateStatus.isPending}
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3px]" />
                              Endorse
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              className="h-8 px-2.5 rounded-lg text-xs flex items-center gap-0.5 cursor-pointer active:scale-95 transition-transform"
                              onClick={() => setRejectingId(c.id)}
                              disabled={updateStatus.isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 grid place-items-center rounded-lg text-fg-secondary cursor-pointer"
                            >
                              <Link href={`/claims/${c.id}`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
