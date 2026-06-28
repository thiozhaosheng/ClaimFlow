"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { InteractiveFlipCard } from "@/components/ui/interactive-flip-card";
import {
  ReceiptText,
  Clock,
  CheckCircle2,
  Wallet,
  ShieldCheck,
  Building,
  Bot,
  ArrowRight,
  TrendingUp,
  Layers,
  Activity,
  Check,
  RefreshCw,
  FileCode,
  CheckCircle,
  Loader2,
  Plus,
  Sun,
  Moon,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useClaims, useUpdateClaimFields } from "@/features/claims/api/queries";
import { ClaimRow } from "@/features/claims/components/claim-row";
import { formatSGD } from "@/core/domain/money";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence, useMotionTemplate, useIsPresent } from "motion/react";
import { useSession } from "@/lib/session-context";
import { NewClaimDialog } from "@/features/claims/components/new-claim-dialog";
import { cn } from "@/lib/cn";
import { CitiLogo } from "@/features/marketing/logo";
import { Button } from "@/components/ui/button";

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  index = 0,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
  index?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightOpacity = useMotionValue(0);
  const [hovered, setHovered] = useState(false);

  const normalPaths = [
    "M 0 25 Q 20 5, 40 20 T 80 10 T 100 15",
    "M 0 15 Q 30 25, 60 10 T 100 5",
    "M 0 5 Q 25 15, 50 5 T 100 25",
    "M 0 25 Q 30 10, 60 20 T 100 5",
  ];

  const hoverPaths = [
    "M 0 20 Q 20 15, 40 5 T 80 25 T 100 10",
    "M 0 25 Q 30 5, 60 20 T 100 15",
    "M 0 15 Q 25 5, 50 25 T 100 5",
    "M 0 10 Q 30 25, 60 5 T 100 20",
  ];

  const normalD = normalPaths[index] || normalPaths[0];
  const hoverD = hoverPaths[index] || hoverPaths[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
    spotlightOpacity.set(1);
  };

  const handleMouseLeave = () => {
    spotlightOpacity.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.025, boxShadow: "0 12px 30px rgba(0,0,0,0.03)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 450, damping: 22 }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        handleMouseLeave();
        setHovered(false);
      }}
      onMouseEnter={() => setHovered(true)}
      className={cn(
        "bg-white/35 dark:bg-black/25 backdrop-blur-md p-4 md:p-[18px] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.01)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.1)] flex flex-col justify-between select-none text-left cursor-pointer relative overflow-hidden group",
        isActive 
          ? "border-accent/80 bg-white/70 dark:bg-zinc-950/45 ring-1 ring-accent/10" 
          : "border-white/20 dark:border-white/[0.05] hover:border-accent/30 dark:hover:border-accent/25 hover:bg-white/45 dark:hover:bg-zinc-950/30"
      )}
    >
      {/* Glossy liquid glass reflection sheen overlay */}
      <motion.div
        className="absolute -inset-px rounded-xl pointer-events-none transition-opacity duration-500 z-10"
        style={{
          opacity: spotlightOpacity,
          background: useMotionTemplate`
            radial-gradient(
              160px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.1) 0%,
              rgba(255, 255, 255, 0.03) 50%,
              transparent 100%
            )
          `
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-secondary">
          {label}
        </span>
        <Icon className={cn("h-4 w-4 transition-colors duration-300", isActive ? "text-accent" : "text-fg-tertiary group-hover:text-accent")} />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-surface" />
        ) : (
          <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-fg">
            {value}
          </p>
        )}
        <span className="text-[10px] font-bold text-fg-secondary/50 group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all">
          {isActive ? "Collapse ↑" : "Expand ↓"}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-fg-tertiary font-medium">{sub}</p>

      {/* Micro-sparkline SVG graph */}
      {!loading && (
        <div className="absolute right-0 bottom-1.5 w-20 h-6 opacity-25 dark:opacity-15 group-hover:opacity-40 transition-opacity">
          <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ 
                pathLength: 1,
                d: hovered ? hoverD : normalD
              }}
              transition={{ 
                pathLength: { duration: 0.8, delay: index * 0.1 },
                d: { type: "spring", stiffness: 100, damping: 15 }
              }}
              fill="none"
              stroke={isActive ? "#6366f1" : "currentColor"}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

function DashboardSuggestionCard({
  task,
  isFront,
  isMiddle,
  isBack,
  cardX,
  cardOpacity,
  stackHovered,
  setDismissedTaskIds,
  setIsExpanded
}: {
  task: any;
  isFront: boolean;
  isMiddle: boolean;
  isBack: boolean;
  cardX: any;
  cardOpacity: any;
  stackHovered: boolean;
  setDismissedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      layout
      drag={isFront && isPresent ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={isFront && isPresent ? { x: cardX, opacity: cardOpacity } : undefined}
      onDragEnd={(e, info) => {
        if (isFront && Math.abs(info.offset.x) > 100) {
          setDismissedTaskIds((prev) => [...prev, task.id]);
        }
      }}
      initial={{ opacity: 0, scale: 0.9, y: 15 }}
      animate={{
        opacity: isFront ? 1 : isMiddle ? 0.75 : 0.4,
        scale: isFront ? 1 : isMiddle ? 0.96 : 0.92,
        y: isFront 
          ? (stackHovered ? -8 : 0) 
          : isMiddle 
            ? (stackHovered ? 20 : 12) 
            : (stackHovered ? 48 : 24),
        x: 0,
        zIndex: isFront ? 20 : isMiddle ? 10 : 0,
      }}
      exit={{ opacity: 0, scale: 0.8, x: -150, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "absolute top-0 inset-x-0 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 text-xs transition-all duration-300 ease-out h-[175px]",
        isFront 
          ? "bg-white dark:bg-zinc-900 border border-border dark:border-zinc-800/80 shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing touch-none z-20" 
          : isMiddle
            ? "bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/85 shadow-md cursor-pointer z-10"
            : "bg-zinc-50 dark:bg-zinc-950 border border-zinc-250/60 dark:border-zinc-900/80 shadow-sm z-0"
      )}
    >
      {isFront ? (
        <>
          <div className="flex gap-3 items-start text-left">
            <div className="relative h-7 w-7 rounded-full bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center text-zinc-650 dark:text-zinc-350 shrink-0 mt-0.5 shadow-inner font-sans">
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-indigo-500/25 filter blur-[2px]"
              />
              <Bot className="h-4 w-4 text-zinc-550 dark:text-zinc-400 relative z-10" />
            </div>
            <div className="min-w-0 flex-grow font-sans text-left">
              <p className="font-bold text-fg">{task.title}</p>
              <p className="mt-0.5 leading-relaxed text-zinc-500 font-medium text-[11px] truncate-2-lines text-left">
                {task.description}
              </p>
              {task.customContent}
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-border/60 pt-2 shrink-0 font-sans">
            <button
              onClick={(e) => {
                e.stopPropagation();
                task.onAction();
              }}
              disabled={task.isLoading}
              className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-900 px-3 py-1 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-1 active:scale-[0.98] cursor-pointer text-[10px] h-7"
            >
              {task.isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-zinc-450" />
                  Processing...
                </>
              ) : (
                task.actionLabel
              )}
            </button>
          </div>
        </>
      ) : null}

      {isMiddle && (
        <div 
          className={cn(
            "absolute bottom-1 inset-x-0 flex items-center justify-center gap-1.5 px-4 font-sans transition-opacity duration-200 select-none",
            stackHovered ? "opacity-0" : "opacity-60"
          )}
        >
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-555">Up Next:</span>
          <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-400 truncate max-w-[180px]">{task.title}</span>
        </div>
      )}
    </motion.div>
  );
}

function DashboardGreetingHero({
  role,
  onNewClaimClick,
  filteredClaims,
  pendingFinanceClaims,
  batchApproving,
  handleBatchApprove,
  payoutRunning,
  payoutStep,
  handleBatchDisburse,
  stats,
  isLoading,
  activeStatIndex,
  setActiveStatIndex,
}: {
  role: string;
  onNewClaimClick: () => void;
  filteredClaims: any[];
  pendingFinanceClaims: any[];
  batchApproving: boolean;
  handleBatchApprove: () => void;
  payoutRunning: boolean;
  payoutStep: number;
  handleBatchDisburse: () => void;
  stats: any[];
  isLoading: boolean;
  activeStatIndex: number | null;
  setActiveStatIndex: (idx: number | null) => void;
}) {
  const { user } = useSession();
  const { data: claimsData } = useClaims();
  const updateClaimFieldsMutation = useUpdateClaimFields();
  const [greeting, setGreeting] = useState("Good morning");
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [timeStr, setTimeStr] = useState("");
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>([]);
  const [stackHovered, setStackHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  const cardX = useMotionValue(0);
  const cardOpacity = useTransform(cardX, [-150, 0, 150], [0.2, 1, 0.2]);

  useEffect(() => {
    cardX.set(0);
  }, [activeTaskIndex, dismissedTaskIds.length]);

  useEffect(() => {
    setTimeout(() => setActiveTaskIndex(0), 0);
  }, [role]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightOpacity = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
    spotlightOpacity.set(1);
  };

  const handleMouseLeave = () => {
    spotlightOpacity.set(0);
  };

  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Singapore",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      };
      setTimeStr(new Intl.DateTimeFormat("en-US", options).format(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hr = new Date().getHours();
    setTimeout(() => {
      if (hr >= 5 && hr < 12) {
        setGreeting("Good morning");
      } else if (hr >= 12 && hr < 17) {
        setGreeting("Good afternoon");
      } else {
        setGreeting("Good evening");
      }
    }, 0);
  }, []);

  const firstName = user?.name ? user.name.split(" ")[0] : "Sarah";

  const flaggedCount = useMemo(() => {
    const list = claimsData ?? [];
    if (role === "Approving Officer") {
      return list.filter((c) => c.status === "Pending" && c.employee !== "Marcus Lim" && c.flagged).length;
    } else if (role === "Finance Admin") {
      return list.filter((c) => c.status === "Endorsed" && c.flagged).length;
    } else {
      return list.filter((c) => (c.employee === "Sarah Tan" || c.employee === user?.name) && c.status === "Pending" && c.flagged).length;
    }
  }, [claimsData, role, user]);

  const hasFlags = flaggedCount > 0;

  const cards = {
    "Employee": {
      sub: hasFlags
        ? `You have ${flaggedCount} flagged submission${flaggedCount > 1 ? "s" : ""} requiring correction. Autofill scanning recommendations below.`
        : "You have CITIBANK transactions pending sync. Snap receipts to file in under a second.",
      cta: (
        <button
          onClick={onNewClaimClick}
          className="bg-accent hover:bg-accent-hover text-accent-fg font-bold rounded-xl px-4 py-2 text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          File New Claim
        </button>
      ),
      pill: hasFlags ? "Action Required" : "AI OCR Ready",
      pillClass: hasFlags
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-450 border-amber-500/20"
        : "bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20",
    },
    "Approving Officer": {
      sub: hasFlags
        ? `You have ${flaggedCount} team claim${flaggedCount > 1 ? "s" : ""} with compliance warnings awaiting your review and endorsement.`
        : "Review and endorse pending team claims. Endorsed claims are immediately queued for payout.",
      cta: (
        <Link
          href="/approvals"
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-4 py-2 text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          Review Approvals
          <ArrowRight className="h-4 w-4" />
        </Link>
      ),
      pill: hasFlags ? "Review Flags" : "Approvals Queue Active",
      pillClass: hasFlags
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    "Finance Admin": {
      sub: hasFlags
        ? `You have ${flaggedCount} payout disbursement${flaggedCount > 1 ? "s" : ""} with active flags requiring audit clearance.`
        : "Citibank treasury node active. Audit clearance and settle queued bank disbursements.",
      cta: (
        <Link
          href="/payouts"
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl px-4 py-2 text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          Process Payouts
          <ArrowRight className="h-4 w-4" />
        </Link>
      ),
      pill: hasFlags ? "Audit Review Required" : "Citibank FAST Live",
      pillClass: hasFlags
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
        : "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    },
  } as const;

  const activeCard = cards[role as keyof typeof cards] || cards["Employee"];

  const themeClasses = {
    "Good morning": {
      gradient: "from-amber-500/[0.06] via-indigo-500/[0.02] to-transparent",
      image: "/sg_morning_workspace.png",
      imgOverlay: "from-amber-500 to-indigo-500",
    },
    "Good afternoon": {
      gradient: "from-sky-500/[0.06] via-emerald-500/[0.02] to-transparent",
      image: "/sg_afternoon_workspace.png",
      imgOverlay: "from-sky-500 to-emerald-500",
    },
    "Good evening": {
      gradient: "from-indigo-600/[0.06] via-purple-650/[0.02] to-transparent",
      image: "/sg_evening_workspace.png",
      imgOverlay: "from-indigo-500 to-purple-500",
    },
  } as const;

  const rawTasks = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      description: string;
      actionLabel: string;
      onAction: () => void;
      isLoading?: boolean;
      isSuccess?: boolean;
      customContent?: React.ReactNode;
    }> = [];

    if (role === "Employee") {
      if (hasFlags) {
        list.push({
          id: "gst-typo",
          title: "AI Assistant suggestion",
          description: "I scanned receipt #1042 and found a GST typo. Autofill the correct value?",
          actionLabel: updateClaimFieldsMutation.isSuccess ? "Corrected ✓" : "Autofill S$26.27",
          isLoading: updateClaimFieldsMutation.isPending && fixingId === "CLM-1042",
          onAction: () => {
            setFixingId("CLM-1042");
            updateClaimFieldsMutation.mutate({
              id: "CLM-1042",
              fields: { gstAmount: 26.27 }
            }, {
              onSuccess: () => setFixingId(null)
            });
          },
          customContent: (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-zinc-400 font-semibold font-sans">Form:</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 line-through bg-zinc-100 dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-800">S$28.00</span>
              <span className="text-[10px] text-zinc-450">→</span>
              <span className="text-[10px] text-zinc-400 font-semibold font-sans ml-1">Receipt:</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono text-zinc-850 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">S$26.27</span>
            </div>
          )
        });
      }

      list.push({
        id: "dbs-sync",
        title: "DBS CardSync Activity",
        description: "You have an unfiled corporate card charge of S$14.50 at Starbucks. Create claim?",
        actionLabel: "Autofill Starbucks Claim",
        onAction: onNewClaimClick,
        customContent: (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20">DBS VISA</span>
            <span className="text-[10px] font-mono text-fg-tertiary">2026-06-25 · S$14.50</span>
          </div>
        )
      });

      list.push({
        id: "policy-warning",
        title: "Policy Audit Requirement",
        description: "Claim CLM-1039 (AWS Training) is missing internal attendee documentation. Add details?",
        actionLabel: "Add Attendees Now",
        onAction: () => alert("Navigating to policy form...")
      });
    } else if (role === "Approving Officer") {
      if (filteredClaims.length > 0) {
        list.push({
          id: "batch-endorse",
          title: "AI Endorsement Recommendation",
          description: `All team documents satisfy compliance policies (100% score). Endorse all ${filteredClaims.length} pending claims?`,
          actionLabel: batchApproving ? "Endorsing..." : "Batch Endorse Team",
          isLoading: batchApproving,
          onAction: handleBatchApprove,
          customContent: (
            <div className="flex items-center gap-2 mt-1.5 select-none">
              <span className="text-[10px] text-zinc-400 font-semibold">Queue:</span>
              <div className="flex items-center gap-1.5">
                {filteredClaims.slice(0, 3).map((c) => (
                  <div key={c.id} className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-2 py-0.5 text-[9px] font-bold font-mono text-zinc-600 dark:text-zinc-400">
                    {c.id}
                  </div>
                ))}
                {filteredClaims.length > 3 && <span className="text-[9px] text-zinc-400">+{filteredClaims.length - 3} more</span>}
              </div>
            </div>
          )
        });
      }

      list.push({
        id: "duplicate-check",
        title: "Compliance Shield Alert",
        description: "Potential double-billing detected: Jumbo Seafood client dinner matches a DBS Visa Sync txn. Resolve?",
        actionLabel: "Compare Receipts",
        onAction: () => alert("Opening receipt compare panel...")
      });

      list.push({
        id: "high-value-audit",
        title: "High Value Audit Review",
        description: "A claim for Singapore Airlines (CLM-1052) exceeds S$500. Complete high-value checklist?",
        actionLabel: "Complete Checklist",
        onAction: () => alert("Opening high-value review checklist...")
      });
    } else if (role === "Finance Admin") {
      if (pendingFinanceClaims.length > 0) {
        list.push({
          id: "batch-disburse",
          title: "FAST Gateway Payout",
          description: `All compliance audits passed. Ready to settle ${pendingFinanceClaims.length} claims via Citibank FAST?`,
          actionLabel: payoutRunning ? "Settling..." : "Disburse FAST",
          isLoading: payoutRunning,
          onAction: handleBatchDisburse,
          customContent: (
            <div className="flex flex-col gap-1 mt-1.5">
              <div className="w-full max-w-[200px] h-1 bg-zinc-150 dark:bg-zinc-800/80 rounded-full relative overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{
                    width: 
                      payoutStep === 1 ? "33%" :
                      payoutStep === 2 ? "66%" :
                      payoutStep === 3 ? "100%" :
                      payoutRunning ? "15%" : "0%"
                  }}
                  className="absolute left-0 h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                />
              </div>
              <div className="flex justify-between items-center w-full max-w-[200px] text-[7px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider select-none">
                <span className={cn(payoutStep >= 1 ? "text-zinc-850 dark:text-zinc-200" : "")}>1. Audit</span>
                <span className={cn(payoutStep >= 2 ? "text-zinc-850 dark:text-zinc-200" : "")}>2. Gateway</span>
                <span className={cn(payoutStep >= 3 ? "text-zinc-850 dark:text-zinc-200" : "")}>3. Settle</span>
              </div>
            </div>
          )
        });
      }

      list.push({
        id: "liquidity-warning",
        title: "FAST Liquidity Level",
        description: "Citibank FAST gateway ledger is down to S$11,800. Allocate more liquidity?",
        actionLabel: "Replenish Gateway Pool",
        onAction: () => alert("Gateway pool replenished!")
      });
    }

    return list;
  }, [role, hasFlags, updateClaimFieldsMutation.isPending, updateClaimFieldsMutation.isSuccess, fixingId, filteredClaims, batchApproving, pendingFinanceClaims, payoutRunning, payoutStep, onNewClaimClick, handleBatchApprove, handleBatchDisburse]);

  const tasks = useMemo(() => {
    return rawTasks.filter((t) => !dismissedTaskIds.includes(t.id));
  }, [rawTasks, dismissedTaskIds]);

  const visibleStack = useMemo(() => {
    if (tasks.length === 0) return [];
    const stack = [];
    for (let i = 0; i < Math.min(3, tasks.length); i++) {
      const idx = (activeTaskIndex + i) % tasks.length;
      stack.push({ task: tasks[idx], offset: i });
    }
    return stack.reverse();
  }, [tasks, activeTaskIndex]);

  useEffect(() => {
    if (activeTaskIndex >= tasks.length && tasks.length > 0) {
      setTimeout(() => {
        setActiveTaskIndex(tasks.length - 1);
      }, 0);
    }
  }, [tasks.length, activeTaskIndex]);

  const activeTheme = themeClasses[greeting as keyof typeof themeClasses] || themeClasses["Good morning"];
  const showSuggestion = tasks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl border border-white/30 dark:border-white/10 bg-white/[0.06] dark:bg-black/[0.12] backdrop-blur-3xl py-6 px-7 flex flex-col justify-between gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.22)] bg-gradient-to-r ${activeTheme.gradient} group`}
    >
      {/* Glossy liquid glass reflection sheen overlay */}
      <motion.div
        className="absolute -inset-px rounded-2xl pointer-events-none transition-opacity duration-500 z-10"
        style={{
          opacity: spotlightOpacity,
          background: useMotionTemplate`
            radial-gradient(
              350px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.09) 0%,
              rgba(255, 255, 255, 0.03) 40%,
              transparent 80%
            )
          `
        }}
      />

      {/* Liquid Glass Morphing Blob 1 */}
      <motion.div
        className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-sky-500/10 blur-3xl pointer-events-none z-0"
        animate={{
          borderRadius: [
            "30% 70% 70% 30% / 30% 30% 70% 70%",
            "50% 50% 20% 80% / 20% 80% 20% 80%",
            "60% 40% 60% 40% / 40% 60% 40% 60%",
            "30% 70% 70% 30% / 30% 30% 70% 70%"
          ],
          x: [0, 20, -10, 0],
          y: [0, -20, 15, 0],
          rotate: [0, 120, 240, 360]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Liquid Glass Morphing Blob 2 */}
      <motion.div
        className="absolute -right-10 -bottom-10 h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-500/10 to-sky-500/10 blur-3xl pointer-events-none z-0"
        animate={{
          borderRadius: [
            "50% 50% 30% 70% / 50% 30% 70% 50%",
            "30% 70% 60% 40% / 40% 60% 40% 60%",
            "60% 40% 50% 50% / 50% 40% 60% 50%",
            "50% 50% 30% 70% / 50% 30% 70% 50%"
          ],
          x: [0, -25, 15, 0],
          y: [0, 20, -10, 0],
          rotate: [0, -120, -240, -360]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Premium animating mesh backdrop glow element */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 15, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute right-20 top-0 h-40 w-40 rounded-full filter blur-[60px] opacity-35 dark:opacity-20 bg-gradient-to-br from-indigo-500/20 to-sky-500/20 pointer-events-none z-0"
      />

      {/* Dynamic Grid Background Overlay */}
      <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05] pointer-events-none select-none z-10 text-fg">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Main Side-by-Side Flex Box */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6 z-20 relative w-full min-h-0">
        {/* Left Side: Welcome Gree        {/* Left Side: Welcome Greeting */}
        <div className="flex-grow flex flex-col justify-between py-1 z-20 flex-1">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${activeCard.pillClass}`}>
                {activeCard.pill}
              </span>
              <span className="text-[9px] font-bold text-fg-tertiary/70 px-2 py-0.5 rounded-full bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                Singapore SGT · {timeStr || "11:09 AM"}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-fg mt-2.5 py-1 pb-1.5 tracking-tight select-none leading-snug flex flex-wrap items-center gap-x-2.5">
              <motion.div
                whileHover={{ scale: 1.12, rotate: [0, -5, 5, 0] }}
                animate={{ y: [0, -2, 0] }}
                transition={{
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                  scale: { type: "spring", stiffness: 300, damping: 15 }
                }}
                className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-full border border-white/20 dark:border-zinc-800 bg-white/20 dark:bg-zinc-850/30 overflow-hidden shadow-sm"
              >
                <img
                  src={
                    role === "Employee" ? "/animoji_employee.jpg" :
                    role === "Approving Officer" ? "/animoji_approver.jpg" :
                    "/animoji_finance.jpg"
                  }
                  alt="Animoji Avatar"
                  className="w-full h-full object-cover scale-[1.05]"
                />
              </motion.div>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-950 dark:from-white dark:via-zinc-200 dark:to-zinc-100">
                {greeting},
              </span>
              <motion.span
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500 dark:from-indigo-400 dark:to-sky-400 inline-block font-black tracking-tight"
              >
                {firstName}
              </motion.span>
            </h2>
            <p className="mt-1 text-xs text-fg-secondary font-semibold leading-relaxed max-w-xl">
              {activeCard.sub}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {activeCard.cta}
          </div>
        </div>

        {/* Right Side: Suggestions Widget Pane */}
        {showSuggestion && (
          <div className="w-full lg:w-[45%] xl:w-[42%] shrink-0 flex flex-col justify-center min-h-0">
            {/* iOS-style Stacked Cards Deck */}
            <div 
              onMouseEnter={() => setStackHovered(true)}
              onMouseLeave={() => setStackHovered(false)}
              className="relative w-full h-[210px] select-none group/stack cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              {/* Clear All stack button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const allIds = tasks.map((t) => t.id);
                  setDismissedTaskIds((prev) => [...prev, ...allIds]);
                  setIsExpanded(false);
                }}
                className="absolute -top-2.5 -right-2.5 z-30 opacity-0 group-hover/stack:opacity-100 hover:scale-105 active:scale-95 bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800 text-fg-secondary hover:text-fg border border-border/80 dark:border-zinc-800 p-1 rounded-full shadow-md cursor-pointer transition-all duration-200 flex items-center justify-center h-6 w-6"
                title="Clear All Suggestions"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <AnimatePresence initial={false}>
                {visibleStack.map(({ task, offset }) => (
                  <DashboardSuggestionCard
                    key={task.id}
                    task={task}
                    isFront={offset === 0}
                    isMiddle={offset === 1}
                    isBack={offset === 2}
                    cardX={cardX}
                    cardOpacity={cardOpacity}
                    stackHovered={stackHovered}
                    setDismissedTaskIds={setDismissedTaskIds}
                    setIsExpanded={setIsExpanded}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* macOS-style Notification Drawer Panel */}
            {mounted && createPortal(
              <AnimatePresence>
                {isExpanded && (
                  <>
                    {/* Backdrop Overlay */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                      }}
                      className="fixed inset-0 bg-black/35 dark:bg-black/55 backdrop-blur-sm z-[999] cursor-pointer"
                    />

                    {/* Slide-out Sidebar Drawer */}
                    <motion.div
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className="fixed right-0 top-0 bottom-0 w-full max-w-[380px] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-l border-border/80 dark:border-zinc-800 z-[1000] shadow-2xl p-5 flex flex-col justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-4 flex-grow overflow-hidden text-left">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-accent font-sans">AI Recommendation Stack</span>
                            <h3 className="text-sm font-bold text-fg mt-0.5 font-sans">AI Suggestions ({tasks.length})</h3>
                          </div>
                          <button
                            onClick={() => {
                              const allIds = tasks.map((t) => t.id);
                              setDismissedTaskIds((prev) => [...prev, ...allIds]);
                              setIsExpanded(false);
                            }}
                            className="text-[9px] font-extrabold uppercase text-fg-secondary hover:text-fg border border-border px-2.5 py-1 rounded-lg cursor-pointer active:scale-95 transition-all font-sans"
                          >
                            Clear All
                          </button>
                        </div>

                        {/* Vertical Scrollable List of Recommendation Cards */}
                        <div className="flex flex-col gap-3.5 overflow-y-auto flex-grow pr-1.5 py-1 select-none">
                          <AnimatePresence initial={false}>
                            {tasks.map((task) => (
                              <motion.div
                                key={task.id}
                                layout
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.7}
                                onDragEnd={(e, info) => {
                                  if (Math.abs(info.offset.x) > 100) {
                                    setDismissedTaskIds((prev) => [...prev, task.id]);
                                  }
                                }}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: -100 }}
                                className="bg-white/[0.05] dark:bg-black/[0.08] backdrop-blur-md border border-white/20 dark:border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.01),inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.02)] rounded-xl p-3.5 flex flex-col justify-between gap-3 text-xs shrink-0 cursor-grab active:cursor-grabbing touch-none hover:bg-white/[0.1] dark:hover:bg-black/[0.14] transition-all duration-300"
                              >
                                <div className="flex gap-3 items-start text-left">
                                  <div className="relative h-7 w-7 rounded-full bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center text-zinc-550 dark:text-zinc-400 shrink-0 mt-0.5 shadow-inner">
                                    <Bot className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-grow font-sans">
                                    <p className="font-bold text-fg">{task.title}</p>
                                    <p className="mt-0.5 leading-relaxed text-zinc-500 font-medium text-[11px] truncate-3-lines">
                                      {task.description}
                                    </p>
                                    {task.customContent}
                                  </div>
                                </div>

                                <div className="flex items-center justify-end border-t border-border/60 pt-2 shrink-0 font-sans">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      task.onAction();
                                    }}
                                    disabled={task.isLoading}
                                    className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-900 px-3 py-1 rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-1 active:scale-[0.98] cursor-pointer text-[10px] h-7"
                                  >
                                    {task.isLoading ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin text-zinc-450" />
                                        Processing...
                                      </>
                                    ) : (
                                      task.actionLabel
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Show Less / Close Button at bottom */}
                      <div className="border-t border-border pt-4 shrink-0 flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(false);
                          }}
                          className="w-full text-center text-xs font-bold uppercase tracking-wider text-fg hover:bg-surface border border-border py-2.5 rounded-xl bg-card shadow-sm active:scale-95 transition-all cursor-pointer font-sans"
                        >
                          Collapse Stack
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>,
              document.body
            )}
          </div>
        )}
      </div>

      {/* 4 Stats Cards nested within the greetings card */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 w-full mt-5.5 z-20 relative">
        {stats.map((s, idx) => (
          <Stat
            key={s.label}
            icon={s.icon}
            label={s.label}
            value={s.value}
            sub={s.sub}
            loading={isLoading}
            index={idx}
            isActive={activeStatIndex === idx}
            onClick={() => setActiveStatIndex(activeStatIndex === idx ? null : idx)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function VisaCorporateCard({ 
  cardholder,
  onClaimClick,
}: { 
  cardholder: string;
  onClaimClick: (tx: any) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-80, 80], isFlipped ? [0, 0] : [4, -4]);
  const rotateY = useTransform(x, [-80, 80], isFlipped ? [0, 0] : [-4, 4]);

  const springConfig = { damping: 25, stiffness: 250 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFlipped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      className="w-full relative aspect-[1.586] cursor-pointer"
      style={{ perspective: 1000 }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        style={{
          rotateX: isFlipped ? 0 : springRotateX,
          rotateY: isFlipped ? 0 : springRotateY,
          transformStyle: "preserve-3d",
        }}
        className="w-full h-full relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full h-full"
        >
          {/* Front Side */}
          <div 
            className={cn(
              "absolute inset-0 w-full h-full rounded-xl p-4 md:p-[18px] bg-zinc-950 text-white shadow-lg border border-zinc-800 flex flex-col justify-between select-none transition-all duration-300",
              isFlipped ? "opacity-0 pointer-events-none" : "opacity-100 z-10"
            )}
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,91,148,0.15),transparent_50%)] pointer-events-none" />

            {/* Top bar: Citi Logo & Visa Badge */}
            <div className="flex justify-between items-start z-10" style={{ transform: "translateZ(15px)" }}>
              <div className="flex items-center gap-2">
                <CitiLogo className="h-4.5 w-7 shrink-0" />
                <span className="font-semibold text-xs tracking-tight text-white font-sans">Citibank Corporate</span>
              </div>
              <span className="text-[9px] font-semibold italic tracking-wider text-zinc-400">VISA</span>
            </div>

            {/* Center part: Gold Microchip & Number */}
            <div className="flex items-center justify-between z-10 my-1" style={{ transform: "translateZ(20px)" }}>
              <svg className="h-6 w-8 text-zinc-650 shrink-0" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.5" y="0.5" width="35" height="27" rx="3.5" fill="#18181b" stroke="#3f3f46" strokeWidth="0.75" />
                <path d="M9 1v26M27 1v26M1 9h34M1 19h34" stroke="#3f3f46" strokeWidth="0.5" />
                <rect x="13.5" y="7.5" width="9" height="13" rx="1.5" fill="#a1a1aa" stroke="#3f3f46" strokeWidth="0.5" />
                <path d="M13.5 14h9M9 14h4.5M22.5 14H27" stroke="#3f3f46" strokeWidth="0.5" />
              </svg>
              <span className="font-mono text-xs md:text-sm tracking-[0.18em] font-medium text-zinc-300">
                •••• •••• •••• 4022
              </span>
            </div>

            {/* Bottom part: Cardholder & Expiry */}
            <div className="flex justify-between items-end z-10" style={{ transform: "translateZ(15px)" }}>
              <div className="text-left leading-none">
                <span className="text-[7px] text-zinc-500 uppercase block font-semibold tracking-wider">Cardholder</span>
                <span className="text-[10px] font-medium text-zinc-300 mt-1 uppercase">{cardholder}</span>
              </div>
              <div className="text-right leading-none">
                <span className="text-[7px] text-zinc-500 uppercase block font-semibold tracking-wider">Expires</span>
                <span className="text-[10px] font-medium text-zinc-300 font-mono mt-1">12/30</span>
              </div>
            </div>
          </div>

          {/* Back Side (Citi Card Sync Feed) */}
          <div 
            className={cn(
              "absolute inset-0 w-full h-full rounded-xl p-3.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-lg border border-zinc-200 dark:border-zinc-850/80 flex flex-col justify-between select-none transition-all duration-300",
              isFlipped ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
            )}
            style={{ 
              backfaceVisibility: "hidden", 
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)" 
            }}
          >
            {/* Subtle premium light/dark background gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/[0.02] dark:from-white/[0.02] dark:to-black/30 pointer-events-none rounded-xl" />

            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5 mb-1.5 z-10">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-accent animate-pulse" />
                Citi Corporate Card Feed
              </span>
              <span className="text-[10px] font-bold text-accent hover:text-accent-hover uppercase transition-colors">Front &rarr;</span>
            </div>

            {/* Scrollable list of transactions */}
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 max-h-[112px] z-10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {[
                {
                  merchant: "Grab Taxi SG",
                  title: "Grab ride to Suntec Client Meeting",
                  amount: "18.20",
                  date: "25 Jun",
                  category: "Transport",
                },
                {
                  merchant: "Peach Garden",
                  title: "Lunch discussions with Acme partners",
                  amount: "124.50",
                  date: "24 Jun",
                  category: "Entertainment",
                },
                {
                  merchant: "Starbucks Coffee",
                  title: "Team alignment coffee session",
                  amount: "24.80",
                  date: "24 Jun",
                  category: "Entertainment",
                },
              ].map((tx, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-all select-none leading-tight"
                  onClick={(e) => e.stopPropagation()} // Prevent card flip
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-left font-sans min-w-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                        {tx.merchant}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold block truncate mt-0.5">
                        {tx.date} &middot; {tx.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-200">
                      {formatSGD(parseFloat(tx.amount))}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card flip
                        onClaimClick({ 
                          ...tx, 
                          date: "2026-06-25", 
                          category: tx.category === "Transport" ? "Transport" : "Client Entertainment" 
                        });
                      }}
                      className="px-2.5 py-0.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-[10px] font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm border border-transparent"
                    >
                      Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function DashboardOverview() {
  const { data, isLoading } = useClaims();
  const { user } = useSession();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<any>(null);

  // Local simulated payouts for Finance Admin
  const [mockPaidIds, setMockPaidIds] = useState<string[]>([]);
  const [payoutRunning, setPayoutRunning] = useState(false);
  const [payoutStep, setPayoutStep] = useState(0);

  // Local simulated approvals for Manager
  const [mockApprovedIds, setMockApprovedIds] = useState<string[]>([]);
  const [batchApproving, setBatchApproving] = useState(false);

  // Local state for interactive ledger validation
  const [ledgerValidState, setLedgerValidState] = useState<"idle" | "validating" | "success">("idle");
  const [auditStep, setAuditStep] = useState(0);

  const [activeStatIndex, setActiveStatIndex] = useState<number | null>(null);
  const [expandedCapIndex, setExpandedCapIndex] = useState<number | null>(null);
  const [showBalanceBreakdown, setShowBalanceBreakdown] = useState(false);

  const role = user?.role || "Employee";

  // Reset states when switching roles
  useEffect(() => {
    setTimeout(() => {
      setMockPaidIds([]);
      setMockApprovedIds([]);
      setPayoutRunning(false);
      setPayoutStep(0);
      setBatchApproving(false);
      setLedgerValidState("idle");
      setAuditStep(0);
      setActiveStatIndex(null);
    }, 0);
  }, [role]);

  const { stats, filteredClaims, cardTitle, viewAllLink, pendingFinanceClaims } = useMemo(() => {
    const rows = (data ?? []).map((c) => {
      let currentStatus = c.status;
      if (mockPaidIds.includes(c.id)) {
        currentStatus = "Paid";
      } else if (mockApprovedIds.includes(c.id)) {
        currentStatus = "Endorsed";
      }
      return { ...c, status: currentStatus };
    });

    if (role === "Employee") {
      const userClaims = rows.filter((c) => c.employee === "Sarah Tan" || c.employee === user?.name);
      return {
        stats: [
          {
            icon: ReceiptText,
            label: "Total Claims",
            value: String(userClaims.length),
            sub: "Filed in this workspace",
            claims: userClaims,
          },
          {
            icon: Clock,
            label: "Pending Review",
            value: String(userClaims.filter((c) => c.status === "Pending").length),
            sub: "Awaiting approval",
            claims: userClaims.filter((c) => c.status === "Pending"),
          },
          {
            icon: CheckCircle2,
            label: "Endorsed Claims",
            value: String(userClaims.filter((c) => c.status === "Endorsed").length),
            sub: "Approved, queued for payout",
            claims: userClaims.filter((c) => c.status === "Endorsed"),
          },
          {
            icon: Wallet,
            label: "Total Reimbursed",
            value: formatSGD(userClaims.filter((c) => c.status === "Paid").reduce((a, c) => a + c.amount, 0)),
            sub: "Paid via GIRO/PayNow",
            claims: userClaims.filter((c) => c.status === "Paid"),
          },
        ],
        filteredClaims: userClaims.slice(0, 5),
        cardTitle: "Recent claims",
        viewAllLink: "/claims",
        pendingFinanceClaims: [],
      };
    } else if (role === "Approving Officer") {
      const departmentClaims = rows.filter((c) => c.department === user?.department);
      const pendingApprovals = departmentClaims.filter((c) => c.status === "Pending" && c.employee !== user?.name);
      const endorsedClaims = departmentClaims.filter((c) => c.status === "Endorsed" || c.status === "Paid");

      return {
        stats: [
          {
            icon: Clock,
            label: "Pending Endorsement",
            value: String(pendingApprovals.length),
            sub: "Awaiting your review",
            claims: pendingApprovals,
          },
          {
            icon: Building,
            label: "Team Total Claims",
            value: String(departmentClaims.length),
            sub: "Active department claims",
            claims: departmentClaims,
          },
          {
            icon: CheckCircle2,
            label: "Endorsed by You",
            value: String(endorsedClaims.length),
            sub: "Approved & routed to Finance",
            claims: endorsedClaims,
          },
          {
            icon: Wallet,
            label: "Total Endorsed Value",
            value: formatSGD(endorsedClaims.reduce((a, c) => a + c.amount, 0)),
            sub: "Approved team funds",
            claims: endorsedClaims,
          },
        ],
        filteredClaims: pendingApprovals.slice(0, 5),
        cardTitle: "Awaiting your approval",
        viewAllLink: "/approvals",
        pendingFinanceClaims: [],
      };
    } else {
      const endorsedClaims = rows.filter((c) => c.status === "Endorsed");
      const paidClaims = rows.filter((c) => c.status === "Paid");

      return {
        stats: [
          {
            icon: Clock,
            label: "Ready for Payout",
            value: String(endorsedClaims.length),
            sub: "Endorsed, awaiting disbursement",
            claims: endorsedClaims,
          },
          {
            icon: Wallet,
            label: "Total Disbursed",
            value: formatSGD(paidClaims.reduce((a, c) => a + c.amount, 0)),
            sub: "Released via GIRO/PayNow",
            claims: paidClaims,
          },
          {
            icon: ShieldCheck,
            label: "Ledger Audit Logs",
            value: String(rows.length + 5),
            sub: "Tamper-proof events logged",
            claims: rows,
          },
          {
            icon: Building,
            label: "Citibank Liquidity",
            value: formatSGD(Math.max(0, 48138 - endorsedClaims.reduce((a, c) => a + c.amount, 0))),
            sub: "Citibank FAST gateway cap",
            claims: endorsedClaims,
          },
        ],
        filteredClaims: endorsedClaims.slice(0, 5),
        cardTitle: "Pending payouts",
        viewAllLink: "/payouts",
        pendingFinanceClaims: endorsedClaims,
      };
    }
  }, [data, role, user, mockPaidIds, mockApprovedIds]);

  const handleLaunchPrefill = (tx: {
    category: string;
    title: string;
    amount: string;
    merchant: string;
    date: string;
  }) => {
    setPrefill({
      category: tx.category,
      title: tx.title,
      amount: tx.amount,
      merchant: tx.merchant,
      date: tx.date,
      fileName: `Card_Receipt_${tx.merchant.replace(/\s+/g, "_")}.pdf`,
    });
    setClaimDialogOpen(true);
  };

  const handleBatchDisburse = () => {
    if (pendingFinanceClaims.length === 0) return;
    setPayoutRunning(true);
    setPayoutStep(1);

    setTimeout(() => {
      setPayoutStep(2);
      setTimeout(() => {
        setPayoutStep(3);
        setTimeout(() => {
          const ids = pendingFinanceClaims.map((c) => c.id);
          setMockPaidIds((prev) => [...prev, ...ids]);
          setPayoutRunning(false);
          setPayoutStep(0);
        }, 900);
      }, 1000);
    }, 1000);
  };

  const handleBatchApprove = () => {
    if (filteredClaims.length === 0) return;
    setBatchApproving(true);
    setTimeout(() => {
      const ids = filteredClaims.map((c) => c.id);
      setMockApprovedIds((prev) => [...prev, ...ids]);
      setBatchApproving(false);
    }, 1200);
  };

  const handleValidateLedger = () => {
    setLedgerValidState("validating");
    setAuditStep(1);
    
    setTimeout(() => {
      setAuditStep(2);
      
      setTimeout(() => {
        setAuditStep(3);
        
        setTimeout(() => {
          setLedgerValidState("success");
        }, 600);
      }, 650);
    }, 650);
  };

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full px-1 lg:h-[calc(100vh-6rem)] lg:overflow-hidden">
      {/* Dashboard Greeting Hero with nested Stats Cards */}
      <DashboardGreetingHero 
        role={role} 
        onNewClaimClick={() => setClaimDialogOpen(true)} 
        filteredClaims={filteredClaims}
        pendingFinanceClaims={pendingFinanceClaims}
        batchApproving={batchApproving}
        handleBatchApprove={handleBatchApprove}
        payoutRunning={payoutRunning}
        payoutStep={payoutStep}
        handleBatchDisburse={handleBatchDisburse}
        stats={stats}
        isLoading={isLoading}
        activeStatIndex={activeStatIndex}
        setActiveStatIndex={setActiveStatIndex}
      />

      {/* Expandable Detail Section */}
      <AnimatePresence>
        {activeStatIndex !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden bg-card border border-accent/20 rounded-xl p-5 shadow-sm text-left flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-accent">Metric details</span>
                <h3 className="text-xs font-semibold text-fg mt-1">
                  Showing entries for: <strong className="text-accent">{stats[activeStatIndex].label}</strong> ({(stats[activeStatIndex] as any).claims?.length || 0})
                </h3>
              </div>
              <button
                onClick={() => setActiveStatIndex(null)}
                className="text-[10px] font-extrabold uppercase text-fg-secondary hover:text-fg hover:bg-surface border border-border px-2.5 py-1 rounded-lg cursor-pointer transition-colors active:scale-95"
              >
                Close details
              </button>
            </div>

            {(stats[activeStatIndex] as any).claims && (stats[activeStatIndex] as any).claims.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-medium text-fg-secondary">
                  <thead>
                    <tr className="border-b border-border text-[9px] font-bold text-fg-tertiary uppercase tracking-wider text-left">
                      <th className="py-2.5">Claim ID</th>
                      {role !== "Employee" && <th className="py-2.5">Claimant</th>}
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Merchant</th>
                      <th className="py-2.5">Category</th>
                      <th className="py-2.5 text-right">Amount</th>
                      <th className="py-2.5 text-center">Status</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats[activeStatIndex] as any).claims.map((claim: any) => (
                      <tr key={claim.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                        <td className="py-3 font-mono font-bold text-fg">{claim.id}</td>
                        {role !== "Employee" && <td className="py-3 font-bold text-fg">{claim.employee}</td>}
                        <td className="py-3 text-fg-secondary">{claim.date}</td>
                        <td className="py-3 text-fg">{claim.merchant}</td>
                        <td className="py-3">
                          <span className="bg-surface border border-border text-fg-secondary px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            {claim.category}
                          </span>
                        </td>
                        <td className="py-3 text-right font-semibold text-fg tabular-nums">{formatSGD(claim.amount)}</td>
                        <td className="py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                              claim.status === "Pending"
                                ? "bg-amber-500/5 text-amber-600 border-amber-500/10 dark:text-amber-400"
                                : claim.status === "Endorsed"
                                  ? "bg-indigo-500/5 text-indigo-600 border-indigo-500/10 dark:text-indigo-400"
                                  : "bg-emerald-500/5 text-emerald-600 border-emerald-500/10 dark:text-emerald-400",
                            )}
                          >
                            {claim.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/claims/${claim.id}`}
                            className="text-[10px] font-extrabold uppercase text-accent hover:underline"
                          >
                            Open Details →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-semibold text-fg-tertiary">
                No matching claims found in this category.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Asymmetrical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 lg:h-full lg:overflow-hidden pb-4 w-full">
        
        {/* Left Column (Main Feed: Queue + Metrics charts) */}
        <div className="lg:col-span-2 flex flex-col gap-4 lg:h-full lg:overflow-hidden min-h-0">
          
          {/* Claims Queue Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-left flex flex-col min-h-0 lg:flex-1">
            <div className="flex items-center justify-between border-b border-border px-4.5 py-3 bg-zinc-50/50 dark:bg-zinc-900/10 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-secondary">{cardTitle}</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface text-fg-secondary font-mono">
                  {filteredClaims.length}
                </span>
              </div>
              <Link
                href={viewAllLink}
                className="text-xs font-medium text-accent hover:underline flex items-center gap-0.5"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse bg-surface/30" />
                ))}
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="p-12 text-center text-sm text-fg-tertiary flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <span className="font-semibold text-fg">Queue fully cleared!</span>
                <span className="text-xs">No active claims waiting for this role.</span>
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-y-auto flex-grow max-h-[300px] lg:max-h-none pr-1">
                {filteredClaims.map((c) => (
                  <li key={c.id} className="relative group/row">
                    <ClaimRow claim={c} dense />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick Actions Panel for Approving Officer (Inside Left Column) */}
          {role === "Approving Officer" && filteredClaims.length > 0 && (
            <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-left">
              <div className="leading-normal">
                <h4 className="text-xs font-semibold text-fg">Batch endorsement available</h4>
                <p className="text-[11px] text-fg-secondary mt-0.5">
                  Approve all {filteredClaims.length} pending claims instantly if they match auto-policy rules.
                </p>
              </div>
              <button
                onClick={handleBatchApprove}
                disabled={batchApproving}
                className="w-full sm:w-auto px-4 py-2 bg-fg hover:opacity-90 disabled:opacity-50 text-canvas rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                {batchApproving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Endorsing Queue...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    Endorse All {filteredClaims.length} Claims
                  </>
                )}
              </button>
            </div>
          )}

          {/* Detailed Metrics Panel (Inside Left Column) */}
          {role === "Employee" && (
            <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm flex flex-col select-none text-left">
              <span className="text-[10px] font-semibold text-fg-tertiary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2.5 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                Q3 Cap Allocations
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Transport & Commute", spent: 18.2, limit: 300 },
                  { label: "Client Entertainment", spent: 0, limit: 500 },
                  { label: "Software & Subscriptions", spent: 300.0, limit: 500 },
                  { label: "Wellness & Medical", spent: 0, limit: 200 },
                ].map((cap) => {
                  const pct = Math.min(100, (cap.spent / cap.limit) * 100);
                  return (
                    <div key={cap.label} className="bg-canvas/20 border border-border p-3 md:p-3.5 rounded-xl flex flex-col justify-between">
                      <div className="flex justify-between items-start leading-tight">
                        <span className="text-xs font-semibold text-fg-secondary">{cap.label}</span>
                        <span className="font-mono text-xs font-semibold text-fg">{formatSGD(cap.spent)}</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="w-full bg-surface dark:bg-zinc-800 h-1 rounded-full overflow-hidden relative">
                          <div className="h-full bg-fg rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-fg-tertiary mt-1 font-semibold uppercase tracking-wider">
                          <span>Limit: {formatSGD(cap.limit)}</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {role === "Approving Officer" && (
            <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm flex flex-col select-none text-left">
              <span className="text-[10px] font-semibold text-fg-tertiary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2.5 mb-3">
                <Layers className="h-3.5 w-3.5 text-zinc-500" />
                Department Expense Distribution
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Client Entertainment", val: 45, amt: "$1,102.68" },
                  { label: "Transport & Commute", val: 30, amt: "$735.12" },
                  { label: "Training & Equipment", val: 25, amt: "$612.60" },
                ].map((item) => (
                  <div key={item.label} className="bg-canvas/20 border border-border p-3 md:p-3.5 rounded-xl flex flex-col justify-between">
                    <span className="text-xs font-semibold text-fg-secondary leading-tight">{item.label}</span>
                    <div className="mt-2.5">
                      <span className="font-mono text-base font-semibold text-fg block">{item.amt}</span>
                      <div className="w-full bg-surface dark:bg-zinc-800 h-1 rounded-full overflow-hidden mt-1.5">
                        <div className="h-full bg-fg" style={{ width: `${item.val}%` }} />
                      </div>
                      <span className="text-[9px] text-fg-tertiary mt-1 block font-semibold uppercase tracking-wider">{item.val}% of budget</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {role === "Finance Admin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cash Flow */}
              <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm flex flex-col justify-between select-none text-left">
                <span className="text-[10px] font-semibold text-fg-tertiary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2.5 mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
                  Monthly Disbursements
                </span>
                <div className="flex gap-2.5 items-end h-20 bg-canvas/30 p-2 rounded-lg border border-border/80">
                  {[
                    { month: "Jan", val: 20 },
                    { month: "Feb", val: 32 },
                    { month: "Mar", val: 40 },
                    { month: "Apr", val: 65 },
                    { month: "May", val: 58 },
                    { month: "Jun", val: mockPaidIds.length > 0 ? 95 : 72 },
                  ].map((bar) => (
                    <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-surface dark:bg-zinc-800 rounded h-12 overflow-hidden flex items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${bar.val}%` }}
                          className="w-full bg-fg"
                        />
                      </div>
                      <span className="text-[8px] font-semibold text-fg-tertiary font-mono">{bar.month}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[9px] text-fg-tertiary font-bold mt-1.5 text-center uppercase tracking-wider block">
                  Volume (S$50k Capital Cap)
                </span>
              </div>

              {/* Accounting Sync */}
              <InteractiveFlipCard
                title="QuickBooks Ledger Connection"
                backContent="This panel manages synchronization status with QuickBooks. Auditing the ledger triggers an automatic SHA-256 block signature verification to confirm database integrity matches MAS nodes."
              >
                <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm flex flex-col justify-between select-none text-left w-full h-full">
                  <span className="text-[10px] font-semibold text-fg-tertiary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2.5 mb-1.5">
                    <FileCode className="h-3.5 w-3.5 text-zinc-500" />
                    Ledger Connection
                  </span>
                  
                  <div className="flex flex-col gap-2.5 font-sans text-xs flex-grow justify-center mt-1.5">
                    <div className="flex justify-between items-center leading-none">
                      <span className="font-semibold text-fg-secondary">QuickBooks Ledger</span>
                      <span className="text-[9px] text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded uppercase font-bold tracking-wide border border-emerald-550/15">Active</span>
                    </div>
                    
                    {ledgerValidState === "success" ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/15 py-1.5 px-2.5 rounded-lg text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold leading-relaxed flex items-start gap-1.5 animate-scale-in">
                        <Check className="h-3.5 w-3.5 stroke-[3.5px] mt-0.5 shrink-0" />
                        <div>
                          <span className="block font-bold">SHA-256 Ledger Verified</span>
                          <span className="block text-[9px] text-fg-secondary mt-0.5">Integrity check passed.</span>
                        </div>
                      </div>
                    ) : ledgerValidState === "validating" ? (
                      <div className="flex flex-col gap-1 bg-canvas py-1.5 px-2.5 rounded-lg border border-border text-[10px] font-medium text-fg-secondary animate-scale-in text-left">
                        <div className="flex items-center justify-between border-b border-border pb-1 mb-1">
                          <span className="uppercase tracking-wider text-fg-tertiary">Cryptographic Audit</span>
                          <Loader2 className="h-3 w-3 text-fg animate-spin" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className={cn("flex items-center gap-1", auditStep >= 1 ? "text-fg font-semibold" : "text-fg-tertiary")}>
                            {auditStep >= 1 ? "✓" : "○"} QuickBooks handshake
                          </div>
                          <div className={cn("flex items-center gap-1", auditStep >= 2 ? "text-fg font-semibold" : "text-fg-tertiary")}>
                            {auditStep >= 2 ? "✓" : "○"} Verify MAS node signatures
                          </div>
                          <div className={cn("flex items-center gap-1", auditStep >= 3 ? "text-fg font-semibold" : "text-fg-tertiary")}>
                            {auditStep >= 3 ? "✓" : "○"} SHA-256 block hash integrity
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleValidateLedger}
                        className="w-full py-2 border border-border hover:border-zinc-350 dark:hover:border-zinc-700 bg-card hover:bg-canvas rounded-lg text-[10px] font-bold uppercase tracking-wider text-fg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                      >
                        Audit Ledger Hash
                      </button>
                    )}
                  </div>
                </div>
              </InteractiveFlipCard>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar widgets stacked) */}
        <div className="lg:col-span-1 flex flex-col gap-4 lg:h-full lg:overflow-y-auto lg:pr-1 min-h-0">
          
          {role === "Employee" && (
            <>
              {/* Corporate Credit Card */}
              <div className="w-full aspect-[1.586] shrink-0 block relative">
                <VisaCorporateCard 
                  cardholder={user?.name || "Sarah Tan"} 
                  onClaimClick={handleLaunchPrefill}
                />
              </div>

              {/* Outstanding Limit metrics panel (Asymmetrical Circular Layout) */}
              <InteractiveFlipCard
                title="Outstanding Balance Details"
                backContent="This widget monitors current corporate card utilization. The circular gauge represents percentage spent of total credit. The limit resets on the 1st of every month."
              >
                <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm text-left flex items-center justify-between gap-4 w-full h-full">
                  <div className="flex-1 min-w-0 leading-tight">
                    <span className="text-[9px] font-semibold text-fg-tertiary uppercase tracking-wider block">Outstanding Balance</span>
                    <span className="text-2xl font-black text-accent tracking-tight mt-1.5 block tabular-nums">S$1,824.50</span>
                    <span className="text-[10px] text-fg-secondary font-medium mt-2 block leading-relaxed">
                      Limit: S$10,000.00 &middot; S$8,175.50 Available
                    </span>
                  </div>
                  
                  {/* Circular Gauge Ring */}
                  <div className="relative h-14 w-14 shrink-0 flex items-center justify-center select-none">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        className="stroke-zinc-150 dark:stroke-zinc-800"
                        strokeWidth="4.5"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="28"
                        cy="28"
                        r="24"
                        className="stroke-accent"
                        strokeWidth="4.5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 24}
                        initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - 0.182) }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-fg">18%</span>
                  </div>
                </div>
              </InteractiveFlipCard>
            </>
          )}

          {role === "Approving Officer" && (
            <>
              {/* Operations Department Budget (Asymmetrical Circular Layout) */}
              <InteractiveFlipCard
                title="Operations Department Budget"
                backContent="This gauge tracks the remaining budget for the Operations team. Employees submitting transport or meal claims consume this balance. Reset takes place quarterly."
              >
                <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm flex items-center justify-between gap-4 select-none text-left w-full h-full">
                  <div className="flex-1 min-w-0 leading-tight">
                    <span className="text-[9px] font-semibold text-fg-tertiary uppercase tracking-wider block">Operations Budget</span>
                    <span className="text-2xl font-black text-amber-650 dark:text-amber-500 tracking-tight mt-1.5 block tabular-nums">S$2,450.40</span>
                    <span className="text-[10px] text-fg-secondary font-medium mt-2 block leading-relaxed">
                      Limit: S$10,000.00 &middot; S$7,549.60 Available
                    </span>
                  </div>
                  
                  {/* Circular Gauge Ring */}
                  <div className="relative h-14 w-14 shrink-0 flex items-center justify-center select-none">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        className="stroke-zinc-150 dark:stroke-zinc-800"
                        strokeWidth="4.5"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="28"
                        cy="28"
                        r="24"
                        className="stroke-amber-500"
                        strokeWidth="4.5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 24}
                        initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - 0.245) }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-fg">25%</span>
                  </div>
                </div>
              </InteractiveFlipCard>

              {/* Approval Speed SLA */}
              <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm select-none text-left">
                <span className="text-[10px] font-semibold text-fg-tertiary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2.5 mb-3">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  Approval Speed SLA
                </span>
                <div className="flex items-center justify-between font-semibold text-fg leading-tight mt-2">
                  <div>
                    <span className="text-[9px] text-fg-tertiary uppercase block">Median Endorsement Time</span>
                    <span className="text-base font-bold mt-1 block">12 minutes</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-fg-tertiary uppercase block">Auto-Clearance Rate</span>
                    <span className="text-base font-bold text-emerald-600 mt-1 block">84.2%</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {role === "Finance Admin" && (
            <>
              {/* Citibank FAST Payouts Terminal Card */}
              <InteractiveFlipCard
                title="Citibank FAST Payouts gateway"
                backContent="This is your Citibank FAST payment settlement portal. Clicking 'Batch Disburse' fires the money to matched corporate employee bank accounts via API gateway instantly."
              >
                <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm flex flex-col justify-between h-[195px] select-none text-left w-full">
                  <div>
                    <span className="text-[10px] font-semibold text-fg-tertiary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2.5">
                      <Wallet className="h-3.5 w-3.5 text-zinc-500" />
                      Citibank FAST Payouts
                    </span>
                    
                    <div className="mt-2.5 flex flex-col gap-0.5 leading-tight">
                      <span className="text-[9px] text-fg-tertiary font-semibold uppercase tracking-wider">Disbursement Queue</span>
                      <p className="text-2xl font-bold tracking-tight text-fg mt-1">
                        {pendingFinanceClaims.length > 0 ? "S$1,862.00" : "S$0.00"}
                      </p>
                      <p className="text-[10px] text-fg-secondary mt-1 font-medium">
                        {pendingFinanceClaims.length > 0 
                          ? `${pendingFinanceClaims.length} Claims ready to release.` 
                          : "Queue fully settled."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-border pt-2">
                    {payoutRunning ? (
                      <div className="flex flex-col gap-1.5 bg-canvas rounded-lg p-2 border border-border font-sans leading-normal">
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="h-3 w-3 text-fg-secondary animate-spin" />
                          <span className="text-[10px] font-semibold text-fg">Clearing...</span>
                        </div>
                      </div>
                    ) : pendingFinanceClaims.length > 0 ? (
                      <button
                        onClick={handleBatchDisburse}
                        className="w-full bg-fg hover:opacity-90 text-canvas rounded-xl py-1.5 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Wallet className="h-4 w-4" />
                        Batch Disburse S$1,862.00
                      </button>
                    ) : (
                      <div className="w-full bg-emerald-500/5 border border-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-1 select-none">
                        <Check className="h-3.5 w-3.5 stroke-[3px]" />
                        FAST Gateway Idle
                      </div>
                    )}
                  </div>
                </div>
              </InteractiveFlipCard>

              {/* Gateway Node Statuses */}
              <div className="bg-card p-4 md:p-[18px] rounded-xl border border-border shadow-sm select-none text-left">
                <span className="text-[10px] font-semibold text-fg-tertiary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2.5 mb-3">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
                  Gateway Status
                </span>
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between items-center font-medium">
                    <span>Citibank FAST Gateway</span>
                    <span className="text-[9px] text-emerald-600 bg-emerald-500/5 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-550/15">Online</span>
                  </div>
                  <div className="flex justify-between items-center font-medium border-t border-border pt-2.5">
                    <span>MAS Clearing Node 02</span>
                    <span className="text-[9px] text-emerald-600 bg-emerald-500/5 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-550/15">Active</span>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
    </div>

      <NewClaimDialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen} prefillData={prefill} />
    </div>
  );
}
