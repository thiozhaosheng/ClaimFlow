"use client";

import { use, useMemo, useState, useEffect, Fragment } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Check,
  X,
  Loader2,
  Wallet,
  Building,
  AlertTriangle,
  GitCommit,
  MessageSquare,
  ShieldCheck,
  ScanLine,
  Clock,
} from "lucide-react";
import { useClaim, useClaimActivity, useUpdateClaimStatus, useAddClaimComment, useUpdateClaimFields } from "@/features/claims/api/queries";
import {
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
import { RequirementsList } from "@/features/claims/components/requirements-list";
import { VisualPipeline } from "@/features/claims/components/visual-pipeline";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session-context";
import { motion, AnimatePresence } from "motion/react";
import { getEmployeeAvatar } from "@/core/domain/avatars";
import { ThemeToggle } from "@/components/shell/theme-toggle";

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

function LiveActivityIsland({ claim }: { claim: any }) {
  const status = claim.status;

  const config = useMemo(() => {
    switch (status) {
      case "Pending":
        return {
          title: "Awaiting Manager Endorsement",
          subtitle: `Department Manager approval pending by Marcus Lim for claim reference ${claim.id}.`,
          percentage: 45,
          color: "#4f46e5",
          brandColor: "text-indigo-600 dark:text-indigo-400",
          timeText: "Verification Pending",
          eta: "Queue Rank: #3",
          location: "Audit Node: Department Manager Approval (Marcus Lim)"
        };
      case "Endorsed":
        return {
          title: "Approved! Handshaking Bank Gateway",
          subtitle: "Clearance queue active: Transferring funds via Citibank Corporate API.",
          percentage: 75,
          color: "#818cf8",
          brandColor: "text-indigo-600 dark:text-indigo-400",
          timeText: "Processing Settlement",
          eta: "Citibank API Handshake Active",
          location: "Bank Clearance: Automated FAST Gateway"
        };
      case "Paid":
        return {
          title: "Disbursed Successfully!",
          subtitle: `Reimbursed via PayNow Corporate to DBS account. Transaction Ref: PY-${claim.id.replace('CLM-','')}-${((claim.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) * 17) % 9000) + 1000}.`,
          percentage: 100,
          color: "#10b981",
          brandColor: "text-emerald-600 dark:text-emerald-400",
          timeText: "Funds Disbursed",
          eta: "Settled",
          location: "Clearance: MAS FAST Bank Settled"
        };
      case "Rejected":
        return {
          title: "Blocked: Claim Rejected",
          subtitle: `Audit failed: Manager policy compliance violation flagged by Marcus Lim.`,
          percentage: 45,
          color: "#f43f5e",
          brandColor: "text-danger",
          timeText: "Audit Terminated",
          eta: "Compliance Flagged",
          location: "Status: Audit Rejected (Marcus Lim)"
        };
      default:
        return {
          title: "Submitted",
          subtitle: "Receipt uploaded and OCR processed.",
          percentage: 15,
          color: "#a1a1aa",
          brandColor: "text-indigo-500",
          timeText: "Just filed",
          eta: "Citibank Queue",
          location: "L1 Ingestion: Sarah Tan"
        };
    }
  }, [status, claim]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 dark:bg-zinc-950/75 text-fg rounded-[2.5rem] p-5 sm:p-6 border border-border dark:border-zinc-800 shadow-card dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md relative overflow-hidden transition-all duration-300"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-4 select-none">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className={`text-[10px] font-black uppercase tracking-widest ${config.brandColor} flex items-center gap-1`}>
            ClaimFlow Live Status
          </span>
        </div>
        <span className="text-[10px] font-bold text-fg-secondary font-mono bg-surface dark:bg-zinc-900 px-2.5 py-0.5 rounded-full border border-border dark:border-zinc-800">
          {config.timeText}
        </span>
      </div>

      {/* Main Stats Block */}
      <div className="flex flex-col gap-1 mb-4 leading-tight">
        <h2 className="text-xl font-black tracking-tight text-fg">{config.title}</h2>
        <p className="text-xs text-fg-secondary font-medium leading-normal max-w-2xl">{config.subtitle}</p>
      </div>

      {/* Dynamic Progress Slider with Carriage */}
      <div className="relative w-full h-8 flex items-center select-none mb-4 bg-surface dark:bg-zinc-900/40 rounded-2xl border border-border dark:border-zinc-850/40 px-3">
        {/* Track Line */}
        <div className="absolute left-3 right-3 h-1.5 bg-border-strong dark:bg-zinc-800 rounded-full" />
        
        {/* Progress Line Fill */}
        <div
          className="absolute left-3 h-1.5 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `calc(${config.percentage}% - 16px)`,
            backgroundColor: status === "Rejected" ? "#EF4444" : "#10B981"
          }}
        />

        {/* Sliding Document Carriage */}
        <motion.div
          initial={{ left: "10px" }}
          animate={{ left: `calc(${config.percentage}% - 10px)` }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className="absolute z-10 flex items-center justify-center -translate-x-1/2"
        >
          <div className="bg-accent text-accent-fg rounded-xl p-1.5 shadow-md border border-accent/20 flex items-center justify-center gap-1 shrink-0 active:scale-95 transition-transform duration-200">
            {status === "Paid" ? (
              <Check className="h-4 w-4 stroke-[3px]" />
            ) : (
              <FileText className="h-4 w-4 animate-pulse" />
            )}
          </div>
        </motion.div>

        {/* Target Vault Node Dot */}
        <div
          className={cn(
            "absolute right-3 h-3 w-3 rounded-full border-2 transition-all duration-500",
            status === "Paid" ? "bg-emerald-500 border-white scale-110" : "bg-border-strong dark:bg-zinc-850 border-border dark:border-zinc-800"
          )}
        />
      </div>

      {/* Footer Info Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-3 border-t border-border dark:border-zinc-905 text-xs font-semibold text-fg-secondary">
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-surface dark:bg-zinc-900 border border-border dark:border-zinc-800 text-fg-secondary px-2 py-0.5 rounded uppercase font-bold">
            {claim.type}
          </span>
          <span className="font-mono text-fg">{formatSGD(claim.amount)}</span>
          <span>·</span>
          <span>{config.location}</span>
        </div>
        <div className="text-fg-tertiary font-medium">
          {config.eta}
        </div>
      </div>
    </motion.div>
  );
}

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: claim, isLoading } = useClaim(id);
  const { data: activity = [] } = useClaimActivity(id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useSession();
  const updateStatusMutation = useUpdateClaimStatus();
  const updateClaimFieldsMutation = useUpdateClaimFields();

  // Endorsement / Reject Form State
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Payout disbursement progress states
  const [paying, setPaying] = useState(false);
  const [payStep, setPayStep] = useState(0);
  const [hoveredCheckId, setHoveredCheckId] = useState<string | null>(null);

  const [showNittyGritty, setShowNittyGritty] = useState(true);
  const [editingGst, setEditingGst] = useState("");

  useEffect(() => {
    if (claim) {
      setTimeout(() => {
        setShowNittyGritty(!claim.flagged);
        setEditingGst(claim.gstAmount != null ? claim.gstAmount.toString() : "");
      }, 0);
      document.title = `${claim.id} · ${claim.title} | ClaimFlow`;
    }
  }, [claim]);

  const requirements = useMemo(
    () => (claim ? deriveRequirements(claim) : []),
    [claim]
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
            })
          )
        : null,
    [claim]
  );

  const complianceChecklist = useMemo(() => {
    if (!claim) return [];
    
    const checks = [];
    
    // Check 1: Receipt uploaded
    const hasReceipt = !!claim.receiptUrl;
    checks.push({
      id: "receipt",
      name: "Receipt Attached",
      status: hasReceipt ? "passed" : "flagged",
      message: hasReceipt 
        ? "Receipt verified." 
        : "Missing receipt. Required above S$50.",
    });

    // Check 2: Duplicate check
    const isDuplicate = claim.id === "CLM-9999"; 
    checks.push({
      id: "duplicate",
      name: "Duplicate Check",
      status: isDuplicate ? "flagged" : "passed",
      message: isDuplicate 
        ? "Duplicate claim detected." 
        : "No duplicates found.",
    });

    // Check 3: GST 9% verification
    let gstStatus: "passed" | "flagged" | "not-applicable" = "passed";
    let gstMsg = "GST calculation correct (9%).";
    if (claim.gstAmount !== undefined && claim.gstAmount !== null) {
      const expectedGst = (claim.amount * 9) / 109;
      const diff = Math.abs(claim.gstAmount - expectedGst);
      if (diff > 0.05) {
        gstStatus = "flagged";
        gstMsg = `GST mismatch: S$${claim.gstAmount.toFixed(2)} vs S$${expectedGst.toFixed(2)} expected.`;
      }
    } else {
      gstStatus = "not-applicable";
      gstMsg = "No GST declared.";
    }
    checks.push({
      id: "gst",
      name: "IRAS 9% GST Audit",
      status: gstStatus,
      message: gstMsg,
    });

    // Check 4: Policy specific checks
    if (claim.type === "Client Entertainment") {
      const hasCompany = !!claim.details?.clientCompany;
      checks.push({
        id: "ent-company",
        name: "Client Company Name",
        status: hasCompany ? "passed" : "flagged",
        message: hasCompany 
          ? `Company: "${claim.details?.clientCompany}".` 
          : "Missing company name.",
      });

      const exceedsLimit = claim.amount > 300;
      checks.push({
        id: "ent-limit",
        name: "Approval Limit Check",
        status: exceedsLimit ? "flagged" : "passed",
        message: exceedsLimit 
          ? `S$${claim.amount.toFixed(2)} exceeds S$300 limit (Department Manager approval required).` 
          : `Within S$300 limit.`,
      });
    }

    if (claim.type === "Transport" && claim.details?.travelWindow === "Late night (22-06)") {
      const exceedsLimit = claim.amount > 25;
      checks.push({
        id: "ot-limit",
        name: "Late Night Cap",
        status: exceedsLimit ? "flagged" : "passed",
        message: exceedsLimit 
          ? `S$${claim.amount.toFixed(2)} exceeds S$25 cap.` 
          : `Within S$25 cap.`,
      });
    }

    return checks;
  }, [claim]);

  const flaggedChecks = useMemo(() => {
    return complianceChecklist.filter((c) => c.status === "flagged");
  }, [complianceChecklist]);

  const spec = claim ? CATEGORY_FIELDS[claim.type] : undefined;
  const detailEntries = spec?.fields
    .map((f) => ({ label: f.label, value: claim?.details?.[f.key] }))
    .filter((e) => e.value !== undefined && e.value !== null && e.value !== "");

  const handleDisburse = () => {
    if (!claim) return;
    setPaying(true);
    setPayStep(1); // API handshake
    
    setTimeout(() => {
      setPayStep(2); // Cryptographic sign
      
      setTimeout(() => {
        setPayStep(3); // Transfer confirmation
        
        setTimeout(() => {
          updateStatusMutation.mutate(
            {
              id: claim.id,
              status: "Paid",
              actorName: user?.name || "Dan Yeo",
              actorRole: user?.role || "Finance Admin",
            },
            {
              onSuccess: () => {
                setPaying(false);
                setPayStep(0);
              },
            }
          );
        }, 800);
      }, 1000);
    }, 1000);
  };

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

  const renderApproverActions = (embedded: boolean = false) => {
    if (claim.status !== "Pending" || user?.role !== "Approving Officer" || claim.department !== user?.department) return null;
    
    const content = (
      <>
        <h2 className={cn("font-bold tracking-tight mb-1 flex items-center gap-1.5", embedded ? "text-sm text-fg" : "text-sm text-amber-800 dark:text-amber-400")}>
          <Building className="h-4 w-4" />
          Approving Officer Actions
        </h2>
        <p className="text-xs text-fg-secondary mb-3 leading-normal">
          Review this pending claim. If it aligns with operations policy, endorse it to forward to Finance.
        </p>
        
        {showRejectForm ? (
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
              Reason for rejection
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason (e.g. Missing client details, budget exceeded)..."
              className="w-full min-h-[60px] rounded-xl border border-border bg-card p-3.5 text-sm placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            <div className="flex gap-2 w-full mt-1">
              <Button
                className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-full py-3 font-semibold text-sm flex items-center justify-center transition-all active:scale-[0.98]"
                onClick={() => {
                  if (!rejectReason) return;
                  updateStatusMutation.mutate({
                    id: claim.id,
                    status: "Rejected",
                    actorName: user.name,
                    actorRole: user.role,
                    reason: rejectReason,
                  });
                  setShowRejectForm(false);
                }}
                disabled={updateStatusMutation.isPending}
              >
                Confirm Reject
              </Button>
              <Button
                variant="ghost"
                className="w-full bg-card hover:bg-surface border border-border text-fg rounded-full py-3 font-semibold text-sm flex items-center justify-center transition-all active:scale-[0.98]"
                onClick={() => setShowRejectForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full mt-1">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-full py-3 font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              onClick={() => {
                updateStatusMutation.mutate({
                  id: claim.id,
                  status: "Endorsed",
                  actorName: user.name,
                  actorRole: user.role,
                });
              }}
              disabled={updateStatusMutation.isPending}
            >
              <Check className="h-4 w-4 stroke-[3px]" />
              Endorse &amp; Route to Finance
            </Button>
            <Button
              variant="ghost"
              className="w-full border border-rose-500/20 text-rose-600 hover:bg-rose-500/5 hover:border-rose-500/30 rounded-full py-3 font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              onClick={() => setShowRejectForm(true)}
              disabled={updateStatusMutation.isPending}
            >
              <X className="h-4 w-4" />
              Reject Claim
            </Button>
          </div>
        )}
      </>
    );

    if (embedded) {
      return (
        <div className="mt-2 flex flex-col gap-3">
          {content}
        </div>
      );
    }

    return (
      <Card className="p-5 border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
        {content}
      </Card>
    );
  };

  const renderFinanceActions = (embedded: boolean = false) => {
    if (claim.status !== "Endorsed" || user?.role !== "Finance Admin") return null;
    
    const content = (
      <>
        <h2 className={cn("font-bold tracking-tight mb-1 flex items-center gap-1.5", embedded ? "text-sm text-fg" : "text-sm text-pink-700 dark:text-pink-400")}>
          <Wallet className="h-4 w-4" />
          Finance Treasury Payout
        </h2>
        <p className="text-xs text-fg-secondary mb-3 leading-normal">
          This claim was endorsed by the approving officer. Release funds to the claimant&apos;s bank account via FAST gateway.
        </p>
        
        {!paying ? (
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-full py-3 font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
            onClick={handleDisburse}
            disabled={updateStatusMutation.isPending}
          >
            <Wallet className="h-4 w-4" />
            Disburse Funds (FAST / PayNow)
          </Button>
        ) : (
          <div className="flex flex-col gap-3 bg-white/40 dark:bg-zinc-900/50 rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4.5 w-4.5 text-indigo-500 animate-spin" />
              <span className="text-xs font-bold text-fg">MAS FAST Handshake Active...</span>
            </div>
            <div className="flex flex-col gap-1 text-xs font-semibold leading-relaxed">
              <div className={cn("flex items-center gap-2", payStep >= 1 ? "text-emerald-600 dark:text-emerald-450 font-bold" : "text-fg-tertiary")}>
                {payStep >= 1 ? "✓" : "○"} Connecting to bank clearing gateway API...
              </div>
              <div className={cn("flex items-center gap-2", payStep >= 2 ? "text-emerald-600 dark:text-emerald-450 font-bold" : "text-fg-tertiary")}>
                {payStep >= 2 ? "✓" : "○"} Cryptographically signing disbursement token...
              </div>
              <div className={cn("flex items-center gap-2", payStep >= 3 ? "text-emerald-600 dark:text-emerald-450 font-bold" : "text-fg-tertiary")}>
                {payStep >= 3 ? "✓" : "○"} Transfer confirmed! Updating claims register...
              </div>
            </div>
          </div>
        )}
      </>
    );

    if (embedded) {
      return (
        <div className="mt-2 flex flex-col gap-3">
          {content}
        </div>
      );
    }

    return (
      <Card className="p-5 border-pink-500/20 bg-pink-500/5 dark:bg-pink-500/10">
        {content}
      </Card>
    );
  };
  const renderWarningCard = () => {
    if (!claim.flagged) return null;
    
    // Determine the fix instruction based on claim ID or flagged checks
    let fixText = "Please review the audit warnings below and verify the e-receipt content. Once verified, click Endorse or Reject.";
    if (claim.id === "CLM-1042") {
      fixText = "GST mismatch detected. Verify the correct GST amount from the scan. If correct, click 'Endorse & Route to Finance' and enter a comment to override the mismatch.";
    } else if (claim.id === "CLM-1041") {
      fixText = "Missing ERP proof. Click 'Upload documents' in the top-right corner to upload the ERP toll receipt statement to satisfy compliance.";
    } else if (claim.id === "CLM-1035") {
      fixText = "Missing attendance log. Click 'Upload documents' to attach the client meeting attendees register.";
    }

    return (
      <Card className="border border-border/80 p-6 flex flex-col gap-6 bg-card h-full justify-between rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.16)] transition-all duration-300 select-none">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-border pb-3 shrink-0 w-full">
            <AlertTriangle className="h-4.5 w-4.5 text-zinc-450 dark:text-zinc-550 shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
              Compliance Review Required
            </h4>
          </div>
          <div className="flex flex-col gap-3">
            {flaggedChecks.map((check) => {
              const shortMsg = 
                check.id === "receipt" ? "Tax invoice attachment required above S$50." :
                check.id === "duplicate" ? "Duplicate transaction matches reference CLM-9999." :
                check.id === "gst" ? "Correct form typo to clear mismatch." :
                check.id === "ent-company" ? "Client business registry name missing." :
                check.id === "ent-limit" ? "Exceeds standard S$300 entertainment threshold." :
                check.id === "ot-limit" ? "Exceeds standard S$25 transport threshold." :
                check.message;

              return (
                <div 
                  key={check.id} 
                  className="bg-rose-500/[0.04] dark:bg-rose-500/[0.08] border border-rose-500/5 p-4 rounded-[20px] flex items-start gap-3.5 hover:bg-rose-500/[0.06] dark:hover:bg-rose-500/[0.1] transition-all duration-300 cursor-default select-none text-left"
                  onMouseEnter={() => setHoveredCheckId(check.id)}
                  onMouseLeave={() => setHoveredCheckId(null)}
                >
                  <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-tight flex-1">
                    <span className="text-sm font-extrabold text-fg block">{check.name}</span>

                    {/* Graphical Indicator Capsules */}
                    {check.id === "gst" && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex items-center gap-1 bg-white/40 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded px-1.5 py-0.5">
                          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 font-mono line-through">S$28.00</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-650 font-bold">→</span>
                          <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 font-mono">S$26.29</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-450 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/15">Mismatch</span>
                      </div>
                    )}

                    {(check.id === "ent-limit" || check.id === "ot-limit") && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex items-center gap-1 bg-white/40 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded px-1.5 py-0.5">
                          <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 font-mono">S${claim.amount.toFixed(2)}</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-650 font-bold">&gt;</span>
                          <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 font-mono">S${check.id === "ent-limit" ? "300.00" : "25.00"} limit</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-450 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/15">Limit Exceeded</span>
                      </div>
                    )}

                    {check.id === "receipt" && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-450 bg-rose-500/10 border border-rose-500/15 px-2 py-0.5 rounded">Missing Doc</span>
                      </div>
                    )}

                    {check.id === "ent-company" && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-450 bg-rose-500/10 border border-rose-500/15 px-2 py-0.5 rounded">Missing Field</span>
                      </div>
                    )}

                    <p className="text-xs text-fg-secondary mt-2 leading-normal font-medium">
                      {shortMsg}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-4 flex flex-col gap-2 shrink-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-fg-tertiary flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 stroke-[2px]" />
            Recommended Action Plan
          </h4>
          {claim.id === "CLM-1042" && claim.gstAmount !== 26.29 ? (
            <div className="flex flex-wrap items-center gap-1.5 mt-1 select-none">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border border-zinc-950">1. Correct GST</span>
              <span className="text-[10px] text-fg-tertiary">→</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-fg-secondary">2. Manager Endorse</span>
              <span className="text-[10px] text-fg-tertiary">→</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-fg-secondary">3. Payout FAST</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 mt-1 select-none">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border border-zinc-950">1. Manager Endorse</span>
              <span className="text-[10px] text-fg-tertiary">→</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-fg-secondary">2. Payout FAST</span>
            </div>
          )}
        </div>

        {/* Instant Self-Correction Action */}
        {claim.status === "Pending" && claim.id === "CLM-1042" && claim.gstAmount !== 26.29 && (
          <div className="border-t border-border pt-4 flex flex-col gap-2 shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
              Instant Self-Correction
            </h4>
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 flex items-center gap-2 select-none">
              <input 
                type="number" 
                step="0.01"
                value={editingGst}
                onChange={(e) => setEditingGst(e.target.value)}
                placeholder="GST (S$)"
                className="w-20 bg-surface border border-border rounded-lg px-2 py-1 text-xs font-semibold font-mono text-fg focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-650"
              />
              <button 
                type="button"
                onClick={() => setEditingGst("26.29")}
                className="text-[10px] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-850 rounded-lg px-2 py-1 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-surface active:scale-[0.97] transition-all cursor-pointer shrink-0"
              >
                Autofill scanned S$26.29
              </button>
              <Button 
                size="sm" 
                variant="primary"
                onClick={() => {
                  const val = parseFloat(editingGst);
                  if (!isNaN(val)) {
                    updateClaimFieldsMutation.mutate({
                      id: claim.id,
                      fields: { gstAmount: val }
                    });
                  }
                }}
                disabled={updateClaimFieldsMutation.isPending || !editingGst}
                className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-900 font-bold select-none cursor-pointer rounded-lg text-xs px-3 py-1 shadow-sm active:scale-[0.98] transition-all shrink-0 ml-auto"
              >
                {updateClaimFieldsMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* Action Center directly embedded inside the card */}
        <div className="border-t border-border pt-4 flex flex-col gap-2 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">Quick Action Resolution</span>
          {renderApproverActions(true) || renderFinanceActions(true) || (
            <div className="w-full flex flex-col gap-2 mt-1">
              {claim.status === "Pending" && (
                <div className="flex items-center justify-between bg-surface border border-border/80 rounded-xl p-2 select-none">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[9px] text-fg-secondary">ML</div>
                    <span className="text-xs font-semibold text-fg">Marcus Lim</span>
                  </div>
                  <span className="text-[9px] font-bold bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Clock className="h-3 w-3 text-zinc-400 shrink-0" /> Pending Approval
                  </span>
                </div>
              )}
              {claim.status === "Endorsed" && (
                <div className="flex flex-col gap-2 bg-surface border border-border/80 rounded-xl p-2 select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[9px] text-fg-secondary">ML</div>
                      <span className="text-xs font-semibold text-fg">Marcus Lim</span>
                    </div>
                    <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Check className="h-3 w-3 text-zinc-500 shrink-0" /> Endorsed
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/50 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[9px] text-fg-secondary">DY</div>
                      <span className="text-xs font-semibold text-fg">Dan Yeo</span>
                    </div>
                    <span className="text-[9px] font-bold bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-400 shrink-0" /> Pending Payout
                    </span>
                  </div>
                </div>
              )}
              {claim.status === "Paid" && (
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 select-none">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-zinc-400 dark:text-zinc-550 shrink-0" />
                    Paid via Corporate FAST
                  </span>
                  <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-lg">
                    Settled
                  </span>
                </div>
              )}
              {claim.status === "Rejected" && (
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 select-none">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <X className="h-4 w-4 text-zinc-400 dark:text-zinc-550 shrink-0" />
                    Claim Declined
                  </span>
                  <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-lg">
                    Rejected
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-6rem)] lg:overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <Button asChild variant="secondary" size="sm">
          <Link href="/claims">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight">{claim.id}</h1>
        <StatusPill status={claim.status} />
        
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {claim.status === "Pending" && (
            <Button size="sm" variant="secondary" onClick={() => setDrawerOpen(true)} className="cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              Upload documents
            </Button>
          )}
        </div>
      </div>

      {/* Integrated Live Claim Tracker Banner */}
      <div className="w-full bg-card border border-border/85 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shrink-0 relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.16)] select-none font-sans">
        {claim.flagged && claim.status === "Pending" && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500 animate-pulse" />
        )}
        
        {/* Left: Employee Profile Stub */}
        <div className="flex items-center gap-3.5 min-w-[200px]">
          <img
            src={getEmployeeAvatar(claim.employee)}
            alt={claim.employee}
            className="h-10 w-10 rounded-full object-cover border border-border bg-surface shrink-0"
          />
          <div>
            <h2 className="text-sm font-bold text-fg leading-none">{claim.employee}</h2>
            <p className="text-[11px] text-fg-secondary font-medium mt-1.5 leading-tight flex items-center gap-1.5 font-sans">
              <span>{claim.department} Department</span>
              <span>·</span>
              <span>Ref: #{claim.id}</span>
            </p>
          </div>
        </div>

        {/* Center: Live Audit Progress Slider */}
        <div className="flex-1 max-w-md flex flex-col gap-2 mx-4">
          <div className="flex justify-between items-baseline text-[10px] text-fg-tertiary uppercase tracking-widest font-bold">
            <span>
              {claim.status === "Pending" ? "Awaiting Approval" :
               claim.status === "Endorsed" ? "Disbursal Queued" :
               claim.status === "Paid" ? "Payout Settled" :
               "Needs Correction"}
            </span>
            <span className="text-emerald-600 dark:text-emerald-450 font-extrabold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> FAST Paynow Active
            </span>
          </div>

          {/* Stepper progress slider track */}
          <div className="relative w-full h-1 bg-border/80 dark:bg-zinc-800 rounded-full my-2 flex items-center">
            {/* Active Green Track Segment */}
            <div 
              className={cn(
                "absolute left-0 h-1 rounded-full",
                claim.status === "Rejected" ? "bg-rose-500" : "bg-emerald-500"
              )}
              style={{
                width: 
                  claim.status === "Pending" ? "66.66%" :
                  claim.status === "Endorsed" ? "85%" :
                  claim.status === "Paid" ? "100%" :
                  "66.66%"
              }}
            />

            {/* Slider Nodes */}
            <div className="absolute left-[33.33%] -translate-x-1/2 flex flex-col items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>

            <div className="absolute left-[66.66%] -translate-x-1/2 flex flex-col items-center">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                claim.status === "Pending" ? "bg-amber-500" : "bg-emerald-500"
              )} />
            </div>

            {/* Target Dot */}
            <div className="absolute right-0 translate-x-1/2 flex flex-col items-center">
              <span className={cn(
                "h-2 w-2 rounded-full border border-border/80 bg-surface",
                claim.status === "Paid" ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
              )} />
            </div>

            {/* Floating indicator icon representing active status */}
            <div 
              className={cn(
                "absolute transition-all duration-700 ease-out z-10",
                claim.status === "Pending" ? "left-[66.66%] -translate-x-1/2" :
                claim.status === "Endorsed" ? "left-[85%] -translate-x-1/2" :
                claim.status === "Paid" ? "left-[100%] -translate-x-1/2" :
                "left-[66.66%] -translate-x-1/2"
              )}
            >
              {claim.status === "Rejected" ? (
                <div className="h-5 w-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md border border-rose-400 select-none">
                  <X className="h-3 w-3 stroke-[3px]" />
                </div>
              ) : claim.status === "Paid" ? (
                <div className="h-5 w-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md border border-emerald-400 select-none">
                  <Check className="h-3 w-3 stroke-[3px]" />
                </div>
              ) : claim.status === "Endorsed" ? (
                <div className="h-5 w-5 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-md border border-indigo-400 select-none">
                  <Wallet className="h-3 w-3" />
                </div>
              ) : (
                <div className="h-5 w-5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-md border border-amber-400 select-none animate-pulse">
                  <Clock className="h-3 w-3 stroke-[3px]" />
                </div>
              )}
            </div>
          </div>

          {/* Subtext description focusing on "What's Next" */}
          <p className="text-[11px] text-fg-secondary font-medium leading-tight font-sans">
            {claim.status === "Pending" ? (
              <>
                Next action: <span className="text-fg font-bold">Ops Manager (Marcus Lim)</span> must endorse the GST mismatch exception.
              </>
            ) : claim.status === "Endorsed" ? (
              <>
                Next action: <span className="text-fg font-bold">Finance Admin (Dan Yeo)</span> must disburse the FAST payout.
              </>
            ) : claim.status === "Paid" ? (
              <>
                Transfer settled: Payout disbursed. <span className="text-fg-tertiary font-normal">No pending actions.</span>
              </>
            ) : (
              <>
                Correction required: <span className="text-fg font-bold">Sarah Tan</span> must upload a valid tax invoice replacement.
              </>
            )}
          </p>
        </div>

        {/* Right: Key Financials */}
        <div className="flex items-center gap-6 md:pl-6 md:border-l border-border/80 shrink-0 select-none">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-fg-tertiary block">Gross Total</span>
            <p className="text-sm font-bold text-fg font-mono mt-0.5">{formatSGD(claim.amount)}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-fg-tertiary block">GST (9%)</span>
            {claim.flagged && claim.status === "Pending" && claim.id === "CLM-1042" && claim.gstAmount !== 26.29 ? (
              <div className="flex items-center gap-1.5 mt-0.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-0.5">
                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 font-mono line-through">S$28.00</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600 font-bold">→</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">S$26.29</span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-fg-secondary font-mono mt-0.5">
                {claim.gstAmount != null ? formatSGD(claim.gstAmount) : "S$0.00"}
              </p>
            )}
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-fg-tertiary block">Compliance</span>
            <div className={cn(
              "flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-md border font-bold text-xs",
              claim.flagged && claim.status === "Pending"
                ? "bg-amber-500/[0.06] text-amber-700 dark:text-amber-400 border-amber-500/25 font-bold" 
                : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                claim.flagged && claim.status === "Pending" ? "bg-amber-500" : "bg-zinc-400 dark:bg-zinc-600"
              )} />
              <span>{claim.flagged && claim.status === "Pending" ? "Flagged" : "Secure"}</span>
            </div>
          </div>
        </div>

      </div>


      <div className="flex flex-col lg:flex-row gap-4 w-full flex-grow min-h-0 lg:overflow-hidden max-w-6xl mx-auto p-0.5 -m-0.5">
        {/* left pane (62%): E-receipt & Audit Comments */}
        <div className="w-full lg:flex-1 shrink-0 flex flex-col gap-4 lg:h-full lg:overflow-hidden p-0.5">
          {claim.receiptUrl && (
            <DigitizedReceipt 
              claim={claim} 
              detailEntries={detailEntries}
              specLabel={spec?.label}
              hoveredCheckId={hoveredCheckId} 
              setHoveredCheckId={setHoveredCheckId}
            />
          )}
        </div>

        {/* right pane (38%): Audit Warnings & Action Resolution Center */}
        <div className="w-full lg:w-[36%] shrink-0 flex flex-col gap-4 lg:h-full lg:overflow-hidden p-0.5">
          {claim.flagged ? renderWarningCard() : (
            <Card className="border border-border/80 p-6 flex flex-col gap-6 bg-card h-full justify-between rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.16)] transition-all duration-300 select-none">
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2 border-b border-border pb-3 shrink-0">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
                    Compliance Clear
                  </h4>
                </div>
                <p className="text-sm text-fg-secondary leading-relaxed mt-1">
                  This claim meets all automated policy checks. No active flags require manual resolution.
                </p>
              </div>
              <div className="flex flex-col gap-3 border-t border-border pt-4 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">Quick Action Resolution</span>
                <div className="flex flex-col gap-4">
                  {renderApproverActions()}
                  {renderFinanceActions()}
                </div>
              </div>
            </Card>
          )}
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
    (r) => r.canUpload || r.state === "missing"
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40 backdrop-blur-md transition-all duration-300" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/20 dark:border-white/10 bg-white/[0.08] dark:bg-black/[0.2] backdrop-blur-3xl saturate-210 shadow-[0_0_80px_rgba(0,0,0,0.1),inset_1px_0_0_0_rgba(255,255,255,0.3)] dark:shadow-[0_0_80px_rgba(0,0,0,0.5),inset_1px_0_0_0_rgba(255,255,255,0.05)] focus:outline-none transition-all duration-300">
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

// ==========================================
// New Audit Enhancements Helpers & Components
// ==========================================

function getReceiptItems(claim: any) {
  switch (claim.id) {
    case "CLM-1042": // Jumbo Seafood
      return [
        { desc: "1x Chili Crab Set A (2 Pax)", qty: 1, rate: 247.55, amount: 247.55 },
        { desc: "2x Chinese Tea", qty: 2, rate: 2.00, amount: 4.00 },
        { desc: "1x Coconut Water", qty: 1, rate: 6.00, amount: 6.00 },
        { desc: "1x Fried Man Tou (6pcs)", qty: 1, rate: 8.00, amount: 8.00 },
        { desc: "Service Charge (10%)", qty: 1, rate: 26.56, amount: 26.56 },
        { desc: "GST (9% Included)", qty: 1, rate: 26.29, amount: 26.29 },
      ];
    case "CLM-1041": // Grab
      return [
        { desc: "1x GrabCar Premium ride", qty: 1, rate: 20.55, amount: 20.55 },
        { desc: "1x Platform Fee", qty: 1, rate: 0.64, amount: 0.64 },
        { desc: "GST (9% Included)", qty: 1, rate: 1.91, amount: 1.91 },
      ];
    case "CLM-1039": // AWS Training
      return [
        { desc: "1x AWS Solutions Architect Masterclass", qty: 1, rate: 1330.28, amount: 1330.28 },
        { desc: "GST (9% Included)", qty: 1, rate: 119.72, amount: 119.72 },
      ];
    case "CLM-1038": // Challenger
      return [
        { desc: "2x Keychron K2 Mechanical Keyboard", qty: 2, rate: 81.65, amount: 163.30 },
        { desc: "GST (9% Included)", qty: 1, rate: 14.70, amount: 14.70 },
      ];
    case "CLM-1035": // Toast Box
      return [
        { desc: "1x Laksa Set (with Barley)", qty: 1, rate: 9.00, amount: 9.00 },
        { desc: "2x Kaya Toast Traditional Set", qty: 2, rate: 5.67, amount: 11.35 },
        { desc: "1x Mee Rebus", qty: 1, rate: 5.80, amount: 5.80 },
        { desc: "GST (9% Included)", qty: 1, rate: 2.35, amount: 2.35 },
      ];
    default: {
      const gst = claim.gstAmount || Math.round(((claim.amount * 9) / 109) * 100) / 100;
      const subtotal = claim.amount - gst;
      return [
        { desc: `${claim.title || "Business Expense Item"}`, qty: 1, rate: subtotal, amount: subtotal },
        { desc: "GST (9% Included)", qty: 1, rate: gst, amount: gst },
      ];
    }
  }
}

function DigitizedReceipt({ 
  claim, 
  detailEntries,
  specLabel,
  hoveredCheckId,
  setHoveredCheckId
}: { 
  claim: any; 
  detailEntries?: { label: string; value: any }[];
  specLabel?: string;
  hoveredCheckId?: string | null;
  setHoveredCheckId?: (v: string | null) => void;
}) {
  const [viewMode, setViewMode] = useState<"scan" | "ledger">("scan");
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);

  const items = getReceiptItems(claim);
  const totalStr = formatSGD(claim.amount);
  const scannedGst = claim.id === "CLM-1042" ? 26.29 : (claim.gstAmount != null ? claim.gstAmount : Math.round(((claim.amount * 9) / 109) * 100) / 100);
  const gstVal = scannedGst;
  const subtotalStr = formatSGD(claim.amount - gstVal);
  const gstStr = formatSGD(gstVal);

  const boundingBoxes = [
    {
      id: "merchant",
      name: "Merchant Name",
      value: claim.merchant || "Merchant Store",
      confidence: "99.8%",
      status: "Verified",
      mappingId: "receipt",
      style: { top: "8%", left: "15%", width: "70%", height: "8%" }
    },
    {
      id: "date",
      name: "Transaction Date",
      value: claim.date || "2026-06-18",
      confidence: "99.5%",
      status: "Verified",
      mappingId: "receipt",
      style: { top: "18%", left: "15%", width: "50%", height: "6%" }
    },
    {
      id: "subtotal",
      name: "Subtotal",
      value: subtotalStr,
      confidence: "99.0%",
      status: "Verified",
      mappingId: "receipt",
      style: { top: "52%", left: "45%", width: "40%", height: "5%" }
    },
    {
      id: "gst",
      name: "GST (9%)",
      value: gstStr,
      confidence: "99.0%",
      status: claim.id === "CLM-1042" && claim.gstAmount !== 26.29 ? `Mismatch: OCR S$26.29 vs Form S$${claim.gstAmount?.toFixed(2) || "28.00"}` : "Verified",
      mappingId: "gst",
      style: { top: "58%", left: "45%", width: "40%", height: "5%" }
    },
    {
      id: "total",
      name: "Gross Total",
      value: totalStr,
      confidence: "100.0%",
      status: "Verified",
      mappingId: "receipt",
      style: { top: "66%", left: "45%", width: "40%", height: "6%" }
    }
  ];

  if (claim.id === "CLM-1041") {
    boundingBoxes.push({
      id: "erp",
      name: "ERP Travel Statement",
      value: "Missing statement proof",
      confidence: "—",
      status: "Required Proof Missing",
      mappingId: "erp",
      style: { top: "28%", left: "15%", width: "70%", height: "6%" }
    });
  }

  if (claim.type === "Client Entertainment" && !claim.details?.clientCompany) {
    boundingBoxes.push({
      id: "clientCompany",
      name: "Client Company Name",
      value: "Missing metadata value",
      confidence: "—",
      status: "Required Metadata Missing",
      mappingId: "ent-company",
      style: { top: "78%", left: "15%", width: "70%", height: "6%" }
    });
  }

  return (
    <Card className="p-6 relative overflow-hidden bg-card border border-border/80 flex flex-col gap-5 lg:h-full lg:min-h-0 justify-between select-none rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.16)] transition-all duration-300">
      <div className="flex flex-col gap-4 flex-grow">
        <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-fg-tertiary">Verified Source</h4>
            <div className="inline-flex p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200/60 dark:border-zinc-800 mt-1.5 shrink-0 select-none">
              <button
                onClick={() => setViewMode("scan")}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-200 cursor-pointer",
                  viewMode === "scan" 
                    ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-zinc-200/50 dark:border-zinc-850" 
                    : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350"
                )}
              >
                Document Scan
              </button>
              <button
                onClick={() => setViewMode("ledger")}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-200 cursor-pointer",
                  viewMode === "ledger" 
                    ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-zinc-200/50 dark:border-zinc-850" 
                    : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350"
                )}
              >
                Digital Ledger
              </button>
            </div>
          </div>
          <div className="text-right">
            <span className="bg-zinc-50 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-350 border border-zinc-200 dark:border-zinc-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-550" /> OCR Verified
            </span>
            <p className="text-[10px] text-fg-secondary font-mono mt-1">Ref: #{claim.id.replace("CLM-", "")}-A8</p>
          </div>
        </div>

        {viewMode === "scan" ? (
          <div className="bg-zinc-50 dark:bg-zinc-950/20 rounded-xl border border-border/50 p-6 flex flex-col items-center justify-center relative overflow-hidden select-none min-h-[440px] flex-grow">
            {/* Apple scan station layout guidelines */}
            <div className="absolute inset-4 border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl pointer-events-none opacity-40" />

            <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 shadow-[0_12px_36px_rgba(0,0,0,0.03)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.22)] rounded-2xl p-6 font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300 relative select-none">
              
              {/* Header block with Logo */}
              <div className="flex flex-col items-center pb-3 border-b border-dashed border-zinc-200 dark:border-zinc-800 mb-3 text-center">
                {claim.merchant?.toUpperCase().includes("GRAB") ? (
                  <div className="h-9 w-9 rounded-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-2 mb-1.5 select-none">
                    <img src="/logo_grab.svg" alt="Grab Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-black text-zinc-700 dark:text-zinc-300 text-xs mb-1.5 select-none font-sans">
                    JS
                  </div>
                )}
                
                {/* Interactive Merchant field */}
                <div
                  className={cn(
                    "px-3 py-1 rounded-xl border transition-all cursor-pointer inline-block",
                    hoveredCheckId === "receipt" || activeBoxId === "merchant"
                      ? "bg-zinc-500/10 border-zinc-550/30 text-zinc-800 dark:text-zinc-200 shadow-sm scale-[1.02]"
                      : "bg-zinc-50 dark:bg-zinc-955 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                  onMouseEnter={() => {
                    setActiveBoxId("merchant");
                    if (setHoveredCheckId) setHoveredCheckId("receipt");
                  }}
                  onMouseLeave={() => {
                    setActiveBoxId(null);
                    if (setHoveredCheckId) setHoveredCheckId(null);
                  }}
                >
                  <p className="font-bold text-[12px] text-zinc-900 dark:text-white uppercase">{claim.merchant || "Merchant Store"}</p>
                </div>
                
                <p className="text-[8px] text-zinc-455 mt-1 font-sans">IRAS GST Reg: 201827419K</p>

                {/* Interactive Date field */}
                <div
                  className={cn(
                    "px-2 py-0.5 rounded-lg border transition-all cursor-pointer mt-1 text-[9px] inline-block",
                    hoveredCheckId === "receipt" || activeBoxId === "date"
                      ? "bg-zinc-500/10 border-zinc-550/30 text-zinc-800 dark:text-zinc-200 shadow-sm scale-[1.02]"
                      : "bg-transparent border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                  onMouseEnter={() => {
                    setActiveBoxId("date");
                    if (setHoveredCheckId) setHoveredCheckId("receipt");
                  }}
                  onMouseLeave={() => {
                    setActiveBoxId(null);
                    if (setHoveredCheckId) setHoveredCheckId(null);
                  }}
                >
                  {claim.date} 09:15
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 pb-3 border-b border-dashed border-zinc-200 dark:border-zinc-800 mb-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-zinc-650 dark:text-zinc-455">
                    <span className="truncate max-w-[170px]">{item.desc}</span>
                    <span className="font-semibold text-zinc-850 dark:text-zinc-350">{formatSGD(item.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="space-y-1.5 pb-3 mb-3 text-right border-b border-dashed border-zinc-200 dark:border-zinc-800">
                
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Subtotal:</span>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-lg border transition-all cursor-pointer",
                      hoveredCheckId === "receipt" || activeBoxId === "subtotal"
                        ? "bg-zinc-500/10 border-zinc-550/30 text-zinc-800 dark:text-zinc-200 shadow-sm scale-[1.02]"
                        : "bg-transparent border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                    onMouseEnter={() => {
                      setActiveBoxId("subtotal");
                      if (setHoveredCheckId) setHoveredCheckId("receipt");
                    }}
                    onMouseLeave={() => {
                      setActiveBoxId(null);
                      if (setHoveredCheckId) setHoveredCheckId(null);
                    }}
                  >
                    {subtotalStr}
                  </div>
                </div>

                {/* GST Tax */}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">GST (9%):</span>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-lg border transition-all cursor-pointer font-bold",
                      claim.id === "CLM-1042" && claim.gstAmount !== 26.29
                        ? hoveredCheckId === "gst" || activeBoxId === "gst"
                          ? "bg-amber-500/[0.08] border-amber-500/40 text-amber-700 dark:text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)] scale-[1.02]"
                          : "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        : hoveredCheckId === "gst" || activeBoxId === "gst"
                          ? "bg-zinc-500/10 border-zinc-550/30 text-zinc-800 dark:text-zinc-200 shadow-sm scale-[1.02]"
                          : "bg-transparent border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                    onMouseEnter={() => {
                      setActiveBoxId("gst");
                      if (setHoveredCheckId) setHoveredCheckId("gst");
                    }}
                    onMouseLeave={() => {
                      setActiveBoxId(null);
                      if (setHoveredCheckId) setHoveredCheckId(null);
                    }}
                  >
                    {gstStr}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                  <span className="font-bold text-zinc-900 dark:text-white">TOTAL:</span>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-lg border transition-all cursor-pointer font-bold",
                      hoveredCheckId === "receipt" || activeBoxId === "total"
                        ? "bg-zinc-500/10 border-zinc-550/30 text-zinc-800 dark:text-zinc-200 shadow-sm scale-[1.02]"
                        : "bg-transparent border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                    onMouseEnter={() => {
                      setActiveBoxId("total");
                      if (setHoveredCheckId) setHoveredCheckId("receipt");
                    }}
                    onMouseLeave={() => {
                      setActiveBoxId(null);
                      if (setHoveredCheckId) setHoveredCheckId(null);
                    }}
                  >
                    {totalStr}
                  </div>
                </div>
              </div>

              {/* Client Entertainment metadata if applicable */}
              {claim.type === "Client Entertainment" && (
                <div className="flex justify-between items-center pb-3 mb-3 border-b border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500">
                  <span>CLIENT CO:</span>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-lg border transition-all cursor-pointer font-bold",
                      !claim.details?.clientCompany
                        ? hoveredCheckId === "ent-company" || activeBoxId === "clientCompany"
                          ? "bg-amber-500/[0.08] border-amber-500/40 text-amber-700 dark:text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)] scale-[1.02]"
                          : "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-transparent border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                    onMouseEnter={() => {
                      setActiveBoxId("clientCompany");
                      if (setHoveredCheckId) setHoveredCheckId("ent-company");
                    }}
                    onMouseLeave={() => {
                      setActiveBoxId(null);
                      if (setHoveredCheckId) setHoveredCheckId(null);
                    }}
                  >
                    {claim.details?.clientCompany || "MISSING"}
                  </div>
                </div>
              )}

              {/* Barcode section */}
              <div className="flex flex-col items-center gap-1 pt-2">
                <div className="h-6 w-full bg-repeating-linear dark:opacity-85 opacity-90" style={{ backgroundImage: "linear-gradient(90deg, #000, #000 1px, transparent 1px, transparent 4px, #000 4px, #000 6px, transparent 6px)" }} />
                <span className="text-[6px] tracking-widest text-zinc-400">*{claim.id.replace("CLM-", "")}-OCR*</span>
              </div>

            </div>

            {/* Bounding box tooltip info */}
            {(() => {
              const activeBox = boundingBoxes.find(b => b.id === activeBoxId) || boundingBoxes.find(b => hoveredCheckId === b.mappingId);
              if (!activeBox) {
                return (
                  <div className="absolute bottom-4 left-4 right-4 text-center text-[10px] text-fg-tertiary">
                    💡 Hover over the glowing fields on the receipt scan to inspect model extraction.
                  </div>
                );
              }
              
              const isWarning = 
                (activeBox.id === "gst" && claim.id === "CLM-1042" && claim.gstAmount !== 26.29) ||
                (activeBox.id === "erp" && claim.id === "CLM-1041") ||
                (activeBox.id === "clientCompany" && !claim.details?.clientCompany);

              return (
                <div className="absolute bottom-4 left-4 right-4 backdrop-blur-md bg-white/90 dark:bg-zinc-950/90 border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-3 rounded-xl text-xs flex flex-col gap-1 transition-all duration-300 z-30 max-w-sm mx-auto select-none leading-normal">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg">{activeBox.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                      isWarning 
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 border border-zinc-200 dark:border-zinc-800"
                    )}>
                      {isWarning ? "Mismatch Flagged" : activeBox.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-fg-secondary mt-1">
                    <span>Extracted Value:</span>
                    <span className="font-mono font-semibold text-fg">{activeBox.value}</span>
                  </div>
                  <div className="flex justify-between text-fg-secondary">
                    <span>Model Confidence:</span>
                    <span className="font-semibold text-fg">{activeBox.confidence}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-grow font-sans">
            {claim.id === "CLM-1041" && (
              <div className="border-l border-amber-500 pl-3.5 py-2 text-xs text-amber-700 dark:text-amber-450 font-semibold shrink-0 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] rounded-r-lg flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Missing original ERP toll statement for validation.</span>
              </div>
            )}

            <div className="flex flex-col gap-2 border-b border-border pb-4 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">Transaction Items</span>
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm text-fg-secondary font-medium">
                  <span className="truncate max-w-[190px]">{item.desc}</span>
                  <span className="font-mono text-fg">{formatSGD(item.amount)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 text-sm text-right border-b border-border pb-4 shrink-0">
              <div className="flex justify-between text-fg-secondary items-center">
                <span>Subtotal:</span>
                <span className="font-mono">{subtotalStr}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className={cn(
                  "flex justify-between text-fg-secondary items-center transition-all duration-300 p-1.5 -mx-1.5 rounded-lg",
                  hoveredCheckId === "gst" ? "bg-zinc-50 dark:bg-zinc-900/50 scale-[1.01]" : "hover:bg-surface/50 hover:scale-[1.01]"
                )}>
                  <span>GST (9%):</span>
                  <span className="font-mono">{gstStr}</span>
                </div>
                {claim.id === "CLM-1042" && claim.gstAmount !== 26.29 && (
                  <div className="border-l border-amber-500 pl-3.5 py-1.5 text-xs text-amber-700 dark:text-amber-450 font-semibold text-left flex items-start gap-2 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] rounded-r-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span>GST Mismatch: Scanned receipt GST is S$26.29 (Form lists S${claim.gstAmount?.toFixed(2) || "28.00"})</span>
                  </div>
                )}
              </div>

              <div className={cn(
                "flex justify-between font-bold text-fg pt-3 border-t border-border mt-2 items-center transition-all duration-300 p-1.5 -mx-1.5 rounded-lg",
                (hoveredCheckId === "ent-limit" || hoveredCheckId === "ot-limit") ? "bg-zinc-50 dark:bg-zinc-900/50 scale-[1.01]" : "hover:bg-surface/50 hover:scale-[1.01]"
              )}>
                <span>Total Payout:</span>
                <span className="font-mono text-base text-fg font-bold">{totalStr}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0 text-sm">
              <div className="flex justify-between">
                <span className="text-fg-tertiary">Purpose/Title:</span>
                <span className="font-medium text-fg text-right max-w-[190px] truncate">{claim.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-tertiary">Payment Source:</span>
                <span className="font-medium text-fg">{claim.bank || "Citibank Corporate"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-tertiary">Expense Date:</span>
                <span className="font-medium text-fg font-mono">{claim.date}</span>
              </div>

              {claim.type === "Client Entertainment" && !claim.details?.clientCompany && (
                <div className={cn(
                  "flex flex-col gap-1.5 transition-all duration-300 p-1.5 -mx-1.5 rounded-lg",
                  hoveredCheckId === "ent-company" ? "bg-zinc-50 dark:bg-zinc-900/50 scale-[1.01]" : "hover:bg-surface/50 hover:scale-[1.01]"
                )}>
                  <div className="flex justify-between text-fg-secondary">
                    <span className="text-fg-tertiary">Client Company:</span>
                    <span className="font-medium text-fg-tertiary">—</span>
                  </div>
                  <div className="border-l border-amber-500 pl-3.5 py-1.5 text-xs text-amber-700 dark:text-amber-455 font-semibold text-left flex items-start gap-2 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] rounded-r-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span>Policy Flag: Attendance register/client company is required.</span>
                  </div>
                </div>
              )}

              {detailEntries && detailEntries.length > 0 && (
                <div className="mt-1 pt-2 border-t border-dashed border-border flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">{specLabel} metadata</span>
                  {detailEntries.map((e) => (
                    <div key={e.label} className="flex justify-between">
                      <span className="text-fg-tertiary">{e.label}:</span>
                      <span className="font-medium text-fg text-right max-w-[190px] truncate">{e.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function AuditComments({
  claim,
  activity,
}: {
  claim: any;
  activity: any[];
}) {
  const { user } = useSession();
  const addCommentMutation = useAddClaimComment();
  const [commentText, setCommentText] = useState("");

  const comments = activity.filter(
    (a) => a.isComment || a.action.startsWith("Left note:") || a.id.startsWith("comment-")
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    
    addCommentMutation.mutate(
      {
        id: claim.id,
        actorName: user.name,
        actorRole: user.role,
        commentText: commentText.trim(),
      },
      {
        onSuccess: () => {
          setCommentText("");
        },
      }
    );
  };

  return (
    <Card className="p-6 flex flex-col gap-4 font-sans h-full min-h-0 justify-between">
      <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
        <h2 className="text-base font-bold tracking-tight text-fg flex items-center gap-1.5">
          <MessageSquare className="h-4.5 w-4.5 text-accent" />
          Audit &amp; Resolution Notes ({comments.length})
        </h2>
        <span className="text-[10px] font-bold text-fg-tertiary uppercase bg-surface dark:bg-zinc-900 border border-border px-2 py-0.5 rounded-full shrink-0">
          Internal Logs
        </span>
      </div>

      {comments.length === 0 ? (
        <div className="py-8 text-center text-xs text-fg-secondary italic font-medium flex-grow">
          No audit notes have been logged for this claim. Leave a comment below to record notes.
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 overflow-y-auto pr-1 flex-grow min-h-0">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 text-xs leading-normal">
              <img
                src={getEmployeeAvatar(comment.actor)}
                alt={comment.actor}
                className="h-6.5 w-6.5 rounded-full object-cover border border-border bg-surface shrink-0 mt-0.5"
              />
              <div className="bg-surface dark:bg-zinc-900/60 border border-border dark:border-white/5 rounded-2xl p-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-fg">{comment.actor}</span>
                  <span className="text-[9px] text-fg-tertiary font-mono">
                    {comment.date} {comment.time}
                  </span>
                </div>
                <p className="text-[10px] text-fg-secondary font-semibold uppercase tracking-wider mb-1">
                  {comment.role}
                </p>
                <p className="text-xs text-fg-secondary font-medium break-words leading-relaxed">
                  {comment.action}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 border-t border-border pt-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={`Log an audit note as ${user.name} (${user.role})...`}
            className="w-full min-h-[56px] text-xs rounded-xl border border-border bg-card p-3 placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium leading-relaxed resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              size="sm"
              className="cursor-pointer"
              disabled={!commentText.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? "Logging..." : "Log Note"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-fg-tertiary italic text-center mt-2 border-t border-border pt-4">
          Log in or switch sandbox role to leave audit comments.
        </p>
      )}
    </Card>
  );
}
