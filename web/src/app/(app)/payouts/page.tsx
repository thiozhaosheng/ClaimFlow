"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useClaims, useUpdateClaimStatus } from "@/features/claims/api/queries";
import { formatSGD } from "@/core/domain/money";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Check, Wallet, ArrowRight, Loader2 } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { motion } from "motion/react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/cn";

export default function PayoutsPage() {
  const { user, switchRole } = useSession();
  const { data: claims = [], isLoading } = useClaims();
  const updateStatus = useUpdateClaimStatus();
  
  useEffect(() => {
    document.title = "FAST Settlements & Treasury | ClaimFlow";
  }, []);
  
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payStep, setPayStep] = useState(0);

  const endorsedClaims = useMemo(() => {
    return claims.filter((c) => c.status === "Endorsed");
  }, [claims]);

  const handleDisburse = (id: string) => {
    setPayingId(id);
    setPayStep(1);

    setTimeout(() => {
      setPayStep(2);
      
      setTimeout(() => {
        setPayStep(3);
        
        setTimeout(() => {
          updateStatus.mutate(
            {
              id,
              status: "Paid",
              actorName: user?.name || "Dan Yeo",
              actorRole: user?.role || "Finance Admin",
            },
            {
              onSuccess: () => {
                setPayingId(null);
                setPayStep(0);
              },
            }
          );
        }, 800);
      }, 1000);
    }, 1000);
  };

  if (user?.role !== "Finance Admin") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/[0.08] dark:bg-black/[0.15] backdrop-blur-3xl saturate-210 shadow-[0_8px_32px_0_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.05)] p-8 text-center"
        >
          <div className="h-12 w-12 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto mb-4 border border-pink-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-fg mb-2">Restricted Access</h2>
          <p className="text-sm text-fg-secondary mb-6 leading-relaxed">
            The Payouts page is reserved for <strong className="text-fg font-bold">Finance Admins</strong> to release funds via GIRO/PayNow and manage treasury accounts.
          </p>
          <div className="flex flex-col gap-2.5">
            <Button
              className="bg-accent text-accent-fg hover:bg-accent-hover font-bold shadow-sm w-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              onClick={() => switchRole("Finance Admin")}
            >
              Switch to Finance Admin (Dan)
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
        eyebrow="Treasury & Settlements"
        title="Payouts Queue"
        subtitle="Disburse funds via Singapore FAST API handshake for endorsed expense claims."
      />

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-card/40" />
            ))}
          </div>
        ) : endorsedClaims.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid place-items-center rounded-2xl border border-dashed border-border-strong bg-card/50 p-16 text-center text-sm text-fg-secondary shadow-sm"
          >
            <div className="h-10 w-10 rounded-full bg-success/10 text-success flex items-center justify-center mb-3">
              <Check className="h-5 w-5" />
            </div>
            <p className="font-semibold text-fg">Payouts queue is clear!</p>
            <p className="text-xs text-fg-tertiary mt-1">All endorsed claims have been settled.</p>
          </motion.div>
        ) : (
          <div id="payouts-gateway-control" className="overflow-hidden rounded-2xl border border-border bg-card/45 dark:bg-card/25 backdrop-blur-3xl saturate-210 shadow-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-white/30 dark:bg-black/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-tertiary">
                {endorsedClaims.length} ready for settlement
              </span>
            </div>
            <ul className="divide-y divide-border">
              {endorsedClaims.map((c) => {
                const isPayingThis = payingId === c.id;
                return (
                  <li
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/10 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <Link href={`/claims/${c.id}`} className="flex items-center gap-3.5 min-w-0 flex-1 group">
                      <CategoryIcon category={c.type} className="h-10 w-10 shrink-0" />
                      <div className="min-w-0 leading-tight">
                        <div className="text-sm font-bold text-fg group-hover:text-accent transition-colors flex items-center gap-2">
                          {c.title}
                          <span className="text-[10px] font-bold font-mono text-fg-tertiary bg-surface px-1.5 py-0.5 rounded border border-border">
                            {c.id}
                          </span>
                        </div>
                        <div className="text-xs text-fg-secondary mt-1 font-medium">
                          By {c.employee} · {c.department} · Payout to {c.bank || "GIRO Bank"}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-black text-fg tabular-nums mr-2">
                        {formatSGD(c.amount)}
                      </span>

                      {isPayingThis ? (
                        <div className="flex flex-col gap-1.5 bg-white/40 dark:bg-black/15 px-3.5 py-2.5 rounded-2xl border border-border min-w-[240px] animate-scale-in text-left">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">
                            <span>FAST clearing API</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">Step {payStep}/3</span>
                          </div>
                          
                          <div className="flex flex-col gap-1 mt-1 font-medium text-[11px] leading-relaxed text-fg-secondary">
                            <div className={cn("flex items-center gap-1.5 transition-colors", payStep >= 1 ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-fg-tertiary")}>
                              {payStep >= 1 ? <Check className="h-3.5 w-3.5 stroke-[3.5px] text-emerald-500 shrink-0" /> : <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                              <span>Connect Citibank clearing gateway</span>
                            </div>
                            <div className={cn("flex items-center gap-1.5 transition-colors", payStep >= 2 ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-fg-tertiary")}>
                              {payStep >= 2 ? <Check className="h-3.5 w-3.5 stroke-[3.5px] text-emerald-500 shrink-0" /> : payStep === 1 ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <span className="h-2 w-2 rounded-full bg-zinc-350 dark:bg-zinc-700 shrink-0" />}
                              <span>Cryptographic token signing</span>
                            </div>
                            <div className={cn("flex items-center gap-1.5 transition-colors", payStep >= 3 ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-fg-tertiary")}>
                              {payStep >= 3 ? <Check className="h-3.5 w-3.5 stroke-[3.5px] text-emerald-500 shrink-0" /> : payStep === 2 ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <span className="h-2 w-2 rounded-full bg-zinc-350 dark:bg-zinc-700 shrink-0" />}
                              <span>MAS central ledger settlement</span>
                            </div>
                          </div>
                          
                          <div className="w-full bg-surface dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden shadow-inner">
                            <div
                              className={cn("h-full transition-all duration-500 rounded-full", payStep === 3 ? "bg-emerald-500" : "bg-indigo-500")}
                              style={{ width: `${(payStep / 3) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-8 px-3 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                            onClick={() => handleDisburse(c.id)}
                            disabled={payingId !== null}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Disburse
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
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
