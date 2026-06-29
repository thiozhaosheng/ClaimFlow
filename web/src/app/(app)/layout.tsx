"use client";

import React, { type ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { useSession } from "@/lib/session-context";
import { ClaimFlowLogo } from "@/features/marketing/logo";
import { NewClaimDialog } from "@/features/claims/components/new-claim-dialog";
import { CommandPalette } from "@/components/shell/command-palette";
import { PortalTour } from "@/components/shell/portal-tour";
import { X, Info } from "lucide-react";
import { cn } from "@/lib/cn";

const ONBOARDING_TIPS: Record<string, Record<string, string>> = {
  "Employee": {
    "/dashboard": "Welcome to your Employee Dashboard! Review monthly spend charts, match card logs, and click 'New Claim' or press N to file requests.",
    "/claims": "This is your Claims Ledger. Track active reimbursement routes, review audit alerts, and verify transaction attachment statuses.",
    "/reports": "Explore monthly analytics. Review compliance audit spreads and spend breakdowns grouped by department policies."
  },
  "Approving Officer": {
    "/dashboard": "Welcome, Manager! Oversee pending approvals, team budget limits, and inspect real-time audit warning logs.",
    "/claims": "Review the full history of company expense claims filed by your team.",
    "/approvals": "Verify and approve team expense requests. Policy compliance triggers (like S$80 meals caps) are flagged automatically.",
    "/reports": "Review manager analytics, cost-per-head averages, and compliance statistics for your team."
  },
  "Finance Admin": {
    "/dashboard": "Welcome, Administrator! Oversee security indices, block hash audit ledgers, and execute bulk FAST bank payout releases.",
    "/claims": "Audit global company billing journals. Match Citibank card sync profiles and filter records by audit checkpoints.",
    "/payouts": "Release pending Citibank FAST deposits. Digital cryptographic block signatures are generated on payout execution.",
    "/audit": "Secure Audit Trail. Verify blockchain hash validity to guarantee that invoices and audit logs are tamper-proof.",
    "/reports": "Inspect corporate budget compliance, tax deductions, and policy limits statistics."
  }
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useSession();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  // Track which page/role the tooltip was dismissed for, so it re-shows on
  // navigation without a setState-in-effect. Derived, not synced.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenClaim = () => setClaimDialogOpen(true);
    window.addEventListener("open-new-claim-dialog", handleOpenClaim);
    return () => window.removeEventListener("open-new-claim-dialog", handleOpenClaim);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4 text-center select-none animate-scale-in">
          <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
            <span className="absolute inset-0 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 animate-pulse border border-indigo-500/20" />
            <ClaimFlowLogo className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-widest text-fg">ClaimFlow</p>
            <p className="text-[10px] font-bold text-fg-tertiary uppercase tracking-wider">Verifying secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Find onboarding tip matching active context
  const activeRole = user?.role || "Employee";
  const normalizedPath = pathname === "/" ? "/dashboard" : pathname;
  const onboardingTip = ONBOARDING_TIPS[activeRole]?.[normalizedPath];
  const onboardingKey = `${activeRole}::${normalizedPath}`;
  const onboardingDismissed = dismissedKey === onboardingKey;

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden shrink-0 border-r border-border lg:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto lg:overflow-hidden px-4 py-4 sm:px-6 lg:px-8 flex flex-col min-h-0">
          <div className="mx-auto w-full max-w-6xl flex-1 flex flex-col min-h-0">{children}</div>
        </main>
      </div>

      <NewClaimDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
      />

      <CommandPalette
        openClaimModal={() => setClaimDialogOpen(true)}
      />

      {/* Floating Walkthrough Onboarding Tooltip Box */}
      {onboardingTip && !onboardingDismissed && (
        <div className="fixed bottom-5 right-5 z-40 max-w-xs rounded-[1.25rem] border border-accent/20 bg-white/95 dark:bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md transition-all animate-bounce-in text-left select-none flex gap-3 items-start">
          <div className="h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 border border-accent/20">
            <Info className="h-3.5 w-3.5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-accent">
                {activeRole} Guide
              </span>
              <button
                type="button"
                onClick={() => setDismissedKey(onboardingKey)}
                className="text-fg-tertiary hover:text-fg p-0.5 rounded transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[10px] text-fg-secondary font-medium mt-1 leading-relaxed">
              {onboardingTip}
            </p>
          </div>
        </div>
      )}

      <PortalTour />
    </div>
  );
}
