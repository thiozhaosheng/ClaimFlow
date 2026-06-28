"use client";

import React from "react";
import { 
  Check, 
  X, 
  FileText, 
  Cpu, 
  UserCheck, 
  CreditCard, 
  ShieldCheck,
  Clock,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import type { Claim } from "@/core/domain/types";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "motion/react";
import { formatSGD } from "@/core/domain/money";

function getInitials(name: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function VectorAvatar({ name, className }: { name: string; className?: string }) {
  const initials = getInitials(name);
  const nameLower = name.toLowerCase();
  const isAI = nameLower.includes("ai") || nameLower.includes("bot");
  const isManager = nameLower.includes("marcus") || nameLower.includes("manager") || nameLower.includes("ops");
  const isFinance = nameLower.includes("dan") || nameLower.includes("finance") || nameLower.includes("treasury") || nameLower.includes("yeo");
  
  const themeClass = isAI
    ? "bg-violet-500/15 border-violet-500/30 text-violet-600 dark:text-violet-400"
    : isManager
    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
    : isFinance
    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
    : "bg-zinc-500/15 border-zinc-500/30 text-fg-secondary";

  return (
    <div className={cn(
      "rounded-full border flex items-center justify-center font-bold shrink-0 select-none",
      themeClass,
      className
    )}>
      {initials}
    </div>
  );
}

const stepIcons = {
  submitted: FileText,
  ocr: Cpu,
  endorsement: UserCheck,
  payout: CreditCard,
};

export function VisualPipeline({ claim, hideDetails = false }: { claim: Claim; hideDetails?: boolean }) {
  const status = claim.status;

  // Determine active step index based on claim status
  let activeIndex = 0;
  if (status === "Pending") activeIndex = 2; // Awaiting Manager review
  else if (status === "Endorsed") activeIndex = 3; // Awaiting Payout
  else if (status === "Paid") activeIndex = 3; // Fully paid
  else if (status === "Rejected") activeIndex = 2; // Rejected at Manager desk

  const [selectedStep, setSelectedStep] = React.useState<number>(activeIndex);

  // Sync selectedStep if claim status changes (e.g. from Pending to Paid on button click)
  React.useEffect(() => {
    setTimeout(() => {
      setSelectedStep(activeIndex);
    }, 0);
  }, [activeIndex]);

  const steps = [
    {
      key: "submitted",
      label: "Receipt Upload",
      desc: claim.employee,
      name: claim.employee,
      percent: 0,
      emoji: "📄",
      completed: true,
    },
    {
      key: "ocr",
      label: "AI OCR Extraction",
      desc: claim.ocrSource !== "unavailable" ? "GST 9% Audited" : "Extraction Failed",
      isAI: true,
      name: "ClaimFlow AI",
      percent: 33.33,
      emoji: "🤖",
      completed: true,
    },
    {
      key: "endorsement",
      label: "Manager Review",
      desc: status === "Pending" ? "Awaiting Ops Review" : status === "Rejected" ? "Policy Flagged" : "Manager Endorsed",
      name: "Marcus Lim",
      percent: 66.66,
      emoji: "👔",
      completed: status === "Endorsed" || status === "Paid",
      rejected: status === "Rejected"
    },
    {
      key: "payout",
      label: "FAST Payout",
      desc: status === "Paid" ? `FAST ${formatSGD(claim.amount)} Settled` : "Queued in Treasury",
      name: "Dan Yeo",
      percent: 100,
      emoji: "🏦",
      completed: status === "Paid",
    }
  ];

  const activeCoord = steps[activeIndex];


  const renderSelectedDetails = () => {
    switch (selectedStep) {
      case 0: { // Receipt Upload / Ingestion
        const merchantName = claim.merchant || "Merchant Store";
        const totalStr = formatSGD(claim.amount);
        const gstVal = claim.gstAmount || 0;
        const subtotalStr = formatSGD(claim.amount - gstVal);
        const gstStr = formatSGD(gstVal);
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Clean Receipt Invoice Mockup */}
            <div className="flex justify-center items-center">
              <div className="w-full max-w-[280px] bg-card border border-border dark:border-white/5 rounded-xl p-5 shadow-sm font-sans text-xs select-none">
                <div className="flex justify-between items-start border-b border-border pb-3 mb-3">
                  <div>
                    <h4 className="font-bold text-fg text-sm">TAX INVOICE</h4>
                    <p className="text-xs text-fg-tertiary font-mono">201827419K (GST Reg)</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Secure File
                  </span>
                </div>

                <div className="space-y-2 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-fg-secondary">Merchant:</span>
                    <span className="font-semibold text-fg uppercase truncate max-w-[140px]">{merchantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-secondary">Date:</span>
                    <span className="text-fg">{claim.date} 09:15</span>
                  </div>
                   <div className="flex justify-between">
                    <span className="text-fg-secondary">Category:</span>
                    <span className="font-medium text-fg uppercase truncate max-w-[140px]" title={claim.type}>{claim.type}</span>
                  </div>
                </div>

                <div className="border-t border-b border-border py-2 mb-3 space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-fg-secondary">
                    <span>DESCRIPTION</span>
                    <span>AMOUNT</span>
                  </div>
                  <div className="flex justify-between text-fg font-medium">
                    <span className="truncate max-w-[150px]">{claim.title || "Business Expense"}</span>
                    <span>{totalStr}</span>
                  </div>
                </div>

                <div className="space-y-2 text-right text-xs">
                  <div className="flex justify-between text-fg-secondary">
                    <span>Subtotal:</span>
                    <span>{subtotalStr}</span>
                  </div>
                  <div className="flex justify-between text-fg-secondary">
                    <span>GST (9%):</span>
                    <span>{gstStr}</span>
                  </div>
                  <div className="flex justify-between font-bold text-fg pt-1.5 border-t border-border text-sm">
                    <span>Total SGD:</span>
                    <span>{totalStr}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: File Metadata Details */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg mb-2">
                <FileText className="h-3.5 w-3.5 text-accent" />
                <span>Uploaded Document Metadata</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-border dark:border-white/5 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-fg-secondary">File Name:</span>
                  <span className="font-mono text-fg font-medium truncate max-w-[180px]">receipt_{claim.id.toLowerCase()}.png</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-fg-secondary">File Size:</span>
                  <span className="text-fg font-medium">1.24 MB</span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-fg-secondary">Uploaded By:</span>
                  <span className="text-fg font-medium flex items-center gap-1.5">
                    <VectorAvatar name={claim.employee} className="h-5 w-5 text-xs" />
                    {claim.employee}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-fg-secondary">Security Check:</span>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> Malware Scan Clean
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-secondary">SHA-256 Checksum:</span>
                  <span className="font-mono text-xs text-fg-tertiary select-all">8af2e1c75c80a22fdfbd8f8f2b3e414c</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 1: { // AI OCR Extraction
        const merchantName = claim.merchant || "Merchant Store";
        const totalStr = formatSGD(claim.amount);
        const gstVal = claim.gstAmount || 0;
        const gstStr = formatSGD(gstVal);
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: AI Extraction Audit Table */}
            <div className="flex flex-col justify-center">
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-border dark:border-white/5 rounded-xl p-4 shadow-inner space-y-3.5 h-[220px] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
                  <span className="font-semibold text-fg text-xs flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-accent" />
                    OCR Extracted Parameters
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-xs font-bold">
                    VERIFIED
                  </span>
                </div>

                <div className="overflow-x-auto flex-grow flex items-center">
                  <table className="w-full text-left font-sans text-xs">
                    <thead>
                      <tr className="border-b border-border text-fg-tertiary text-xs uppercase font-bold tracking-wider">
                        <th className="pb-1.5">Field</th>
                        <th className="pb-1.5">Extracted Value</th>
                        <th className="pb-1.5 text-right">Confidence</th>
                        <th className="pb-1.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      <tr>
                        <td className="py-2 font-medium text-fg-secondary">Merchant</td>
                        <td className="py-2 text-fg font-bold uppercase truncate max-w-[100px]">{merchantName}</td>
                        <td className="py-2 text-right font-mono text-fg-secondary">99.7%</td>
                        <td className="py-2 text-right"><span className="text-emerald-500 font-bold">Matched</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium text-fg-secondary">Txn Date</td>
                        <td className="py-2 text-fg font-mono">{claim.date}</td>
                        <td className="py-2 text-right font-mono text-fg-secondary">99.5%</td>
                        <td className="py-2 text-right"><span className="text-emerald-500 font-bold">Matched</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium text-fg-secondary">Total (SGD)</td>
                        <td className="py-2 text-fg font-bold font-mono">{totalStr}</td>
                        <td className="py-2 text-right font-mono text-fg-secondary">100%</td>
                        <td className="py-2 text-right"><span className="text-emerald-500 font-bold">Matched</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium text-fg-secondary">GST (9%)</td>
                        <td className="py-2 text-fg font-mono">{gstStr}</td>
                        <td className="py-2 text-right font-mono text-fg-secondary">99.0%</td>
                        <td className="py-2 text-right"><span className="text-emerald-500 font-bold">Reconciled</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: AI Extraction & Compliance check status */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span>Extraction & Tax Audit Logs</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-border dark:border-white/5 rounded-xl p-4 space-y-3 text-xs h-[220px] flex flex-col justify-between">
                <div className="space-y-2 pb-2 border-b border-border">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-fg-secondary">OCR Extraction Source:</span>
                    <span className="font-semibold text-fg">ClaimFlow DocIntel-LLM v4.2</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-fg-secondary">Processing Time:</span>
                    <span className="font-mono text-fg font-semibold">241 ms</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-fg-secondary">Extraction Confidence:</span>
                    <span className="text-emerald-500 font-bold font-mono">99.7% Matches</span>
                  </div>
                </div>

                <div className="space-y-3 flex-grow flex flex-col justify-center">
                  <div className="flex items-start gap-2 text-xs text-fg-secondary">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Validated supplier UEN registration details in Singapore IRAS directory.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-fg-secondary">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Mathematical check passed: GST tax 9% breakdown matches subtotal sum accurately.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 2: { // Manager Review
        const signatureHash = `sig_0x${claim.id.replace('CLM-', '')}_${status === 'Pending' ? 'pending' : 'f92a00c7b2e1'}`;
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Digital Sign-off slip */}
            <div className="flex justify-center items-center">
              <div className="w-full max-w-[280px] bg-card border border-border dark:border-white/5 rounded-xl p-5 shadow-sm flex flex-col justify-between h-[220px] select-none">
                <div>
                  <h4 className="text-xs font-bold text-fg-tertiary uppercase tracking-wider">ENDORSEMENT SLIP</h4>
                  <div className="flex items-center gap-3 mt-3">
                    <VectorAvatar name="Marcus Lim" className="h-10 w-10 text-xs" />
                    <div>
                      <p className="font-semibold text-fg text-sm">Marcus Lim</p>
                      <p className="text-xs text-fg-secondary">Operations Manager</p>
                    </div>
                  </div>
                </div>

                <div className="my-3 border-t border-b border-border py-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-fg-secondary">Review Status:</span>
                    <span className={cn(
                      "font-bold text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                      status === "Pending" ? "bg-amber-500/10 text-amber-500" :
                      status === "Rejected" ? "bg-rose-500/10 text-rose-500" :
                      "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {status === "Pending" ? "Awaiting Review" :
                       status === "Rejected" ? "Rejected" : "Approved"}
                    </span>
                  </div>
                </div>

                <div>
                  {status === "Pending" ? (
                    <p className="text-xs text-fg-tertiary italic text-center">Awaiting signature approval...</p>
                  ) : (
                    <div className="text-center font-mono">
                      <p className="text-xs font-bold text-fg">{status === "Rejected" ? "SIGNATURE VOID" : "DIGITALLY SIGNED"}</p>
                      <p className="text-[11px] text-fg-tertiary mt-0.5 truncate max-w-[240px] select-all">{signatureHash}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Compliance Checklist */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg mb-2">
                <UserCheck className="h-3.5 w-3.5 text-accent" />
                <span>Compliance Engine Audit Register</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-border dark:border-white/5 rounded-xl p-4 text-xs h-[220px] flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs border-b border-border/40 pb-1.5">
                    <span className="text-fg-secondary font-medium">1. L1 Policy Limit Check (&lt; S$500.00)</span>
                    <span className="font-semibold text-emerald-500 flex items-center gap-0.5">
                      <Check className="h-3.5 w-3.5 stroke-[2.5px]" /> Passed
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-b border-border/40 pb-1.5">
                    <span className="text-fg-secondary font-medium">2. Duplicate Verification (90 days)</span>
                    <span className="font-semibold text-emerald-500 flex items-center gap-0.5">
                      <Check className="h-3.5 w-3.5 stroke-[2.5px]" /> 0 Matches
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-b border-border/40 pb-1.5">
                    <span className="text-fg-secondary font-medium">3. Category Budget Validation</span>
                    <span className="font-semibold text-emerald-500 flex items-center gap-0.5">
                      <Check className="h-3.5 w-3.5 stroke-[2.5px]" /> Entitled
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pb-0.5">
                    <span className="text-fg-secondary font-medium">4. Dynamic Policy Engine Flag</span>
                    {claim.flagged ? (
                      <span className="font-semibold text-rose-500 flex items-center gap-0.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Flagged
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-500 flex items-center gap-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[2.5px]" /> Compliant
                      </span>
                    )}
                  </div>
                </div>

                {/* Flagged Policy Rejection details */}
                {claim.flagged && (
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 flex flex-col gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium shrink-0">
                    <div className="flex items-center gap-1 font-semibold uppercase text-[10px] tracking-wider text-rose-500">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Compliance Warning Code</span>
                    </div>
                    <span className="italic leading-normal text-fg-secondary mt-0.5 line-clamp-2">
                      {status === "Rejected" 
                        ? `"Policy compliance flagged: Missing client meeting details in description. Please provide names of dinner attendees."`
                        : `"Missing client meeting attendee roster. Route to human for manual verification."`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 3: { // FAST Payout
        const bankName = claim.bank || "DBS Bank Ltd (*4829)";
        const totalStr = formatSGD(claim.amount);
        const refId = status === "Paid" ? `FT_${claim.id.replace('CLM-','')}_89AD9` : "Awaiting Clearance";
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Citibank FAST Payment Advice Mockup */}
            <div className="flex justify-center items-center">
              <div className="w-full max-w-[280px] bg-card border border-border dark:border-white/5 rounded-xl p-4 font-sans text-xs select-none h-[220px] flex flex-col justify-between shadow-sm">
                <div className="border-b border-border pb-2 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-fg tracking-wide">Citibank Singapore</span>
                    <span className="text-[10px] uppercase tracking-widest text-fg-tertiary">FAST Payment Advice</span>
                  </div>
                  <span className={cn(
                    "font-bold text-xs px-2 py-0.5 rounded-full uppercase tracking-wider",
                    status === "Paid" ? "bg-emerald-500/10 text-emerald-500" :
                    status === "Endorsed" ? "bg-blue-500/10 text-blue-500" :
                    "bg-zinc-500/10 text-fg-secondary"
                  )}>
                    {status === "Paid" ? "COMPLETED" : status === "Endorsed" ? "QUEUED" : "PENDING"}
                  </span>
                </div>

                <div className="space-y-1.5 my-2 flex-grow flex flex-col justify-center text-xs">
                  <div className="flex justify-between">
                    <span className="text-fg-secondary">Disbursement Type:</span>
                    <span className="font-semibold text-fg">FAST Transfer</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-secondary">Beneficiary Name:</span>
                    <span className="font-semibold text-fg">{claim.employee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-secondary">Target Bank Account:</span>
                    <span className="font-semibold text-fg truncate max-w-[130px]">{bankName}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1.5 border-t border-border">
                    <span className="text-fg">Disbursed Amount:</span>
                    <span className="text-fg">{totalStr}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-2 flex justify-between items-center text-xs font-mono text-fg-tertiary">
                  <span>REF: {refId}</span>
                  <span>{status === "Paid" ? claim.date : "PENDING"}</span>
                </div>
              </div>
            </div>

            {/* Right Column: QuickBooks Double-Entry Accounting Ledger */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg mb-2">
                <CreditCard className="h-3.5 w-3.5 text-accent" />
                <span>General Ledger Sync (QuickBooks Online)</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-border dark:border-white/5 rounded-xl p-4 text-xs h-[220px] flex flex-col justify-between">
                <div className="space-y-2">
                  <table className="w-full text-left font-mono text-xs leading-relaxed">
                    <thead>
                      <tr className="border-b border-border text-fg-tertiary">
                        <th className="pb-1 font-bold">GL CODE</th>
                        <th className="pb-1 font-bold">ACCOUNT NAME</th>
                        <th className="pb-1 text-right font-bold">DEBIT</th>
                        <th className="pb-1 text-right font-bold">CREDIT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="py-1 text-fg">6120</td>
                        <td className="py-1 text-fg-secondary truncate max-w-[90px]">Travel & Ent</td>
                        <td className="py-1 text-right text-emerald-500 font-bold">{totalStr}</td>
                        <td className="py-1 text-right text-fg-tertiary">-</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-fg">1010</td>
                        <td className="py-1 text-fg-secondary truncate max-w-[90px]">Citibank Cash</td>
                        <td className="py-1 text-right text-fg-tertiary">-</td>
                        <td className="py-1 text-right text-rose-500 font-bold">{totalStr}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-border pt-2 text-xs text-fg-secondary">
                  {status === "Paid" ? (
                    <div className="flex justify-between items-center">
                      <span>Ledger Sync: <span className="font-semibold text-emerald-500">Synced</span></span>
                      <span className="font-mono text-xs text-fg-tertiary">QB-CLM-{claim.id.replace('CLM-','')}</span>
                    </div>
                  ) : status === "Endorsed" ? (
                    <div className="flex justify-between items-center">
                      <span>Ledger Sync: <span className="text-amber-500 font-medium">Awaiting Funds</span></span>
                      <span className="font-mono text-xs text-fg-tertiary">QB-Draft</span>
                    </div>
                  ) : (
                    <p className="text-fg-tertiary italic text-xs">Sync pending approval endorsement.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="w-full py-5 px-4 rounded-3xl bg-white/[0.04] dark:bg-black/[0.12] border border-border dark:border-white/5 shadow-inner relative overflow-hidden select-none h-auto">
      
      {/* Mobile Vertical Timeline (stacked) */}
      <div className="flex flex-col gap-5 sm:hidden px-1 py-1">
        {steps.map((step, idx) => {
          const isCurrent = idx === activeIndex;
          const isCompleted = step.completed;
          const isRejected = (step as any).rejected;
          const StepIcon = stepIcons[step.key as keyof typeof stepIcons] || FileText;

          return (
            <div 
              key={step.key} 
              className={cn(
                "flex items-start gap-4 relative cursor-pointer p-2.5 rounded-2xl hover:bg-zinc-500/5 transition-colors",
                selectedStep === idx ? "bg-zinc-500/10 dark:bg-white/5 ring-1 ring-border/80" : ""
              )}
              onClick={() => setSelectedStep(idx)}
            >
              {/* Vertical connector line between nodes */}
              {idx < steps.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-[33px] top-[56px] bottom-[-28px] w-0.5 border-l border-dashed",
                    isCompleted ? "border-emerald-500" : "border-zinc-200 dark:border-zinc-800"
                  )}
                />
              )}

              {/* Station Circle Node */}
              <div
                className={cn(
                  "h-12 w-12 rounded-full border-2 flex items-center justify-center bg-card transition-all duration-300 shadow-sm relative overflow-hidden shrink-0",
                  selectedStep === idx ? "ring-2 ring-accent ring-offset-2 dark:ring-offset-zinc-950 scale-105" : "",
                  isCompleted
                    ? "border-emerald-500 text-emerald-500 dark:border-emerald-400 bg-emerald-50/20 dark:bg-emerald-500/10"
                    : isRejected
                    ? "border-danger text-danger bg-danger-bg"
                    : isCurrent
                    ? "border-accent text-accent scale-105"
                    : "border-border-strong text-fg-tertiary dark:border-zinc-800"
                )}
              >
                <StepIcon className="h-5 w-5 stroke-[2px]" />
                
                {/* Step Emoji Corner Badge */}
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-0.5 border border-border-strong dark:border-zinc-800 shadow-sm flex items-center justify-center overflow-hidden h-6 w-6 text-[11px]">
                  {step.emoji}
                </div>

                {isCurrent && (
                  <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                  </span>
                )}
              </div>

              {/* Labels & Description */}
              <div className="flex-grow min-w-0 pt-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-bold tracking-tight", 
                    isCurrent ? "text-fg" : isCompleted ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : isRejected ? "text-danger" : "text-fg-tertiary"
                  )}>
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider animate-pulse">Active</span>
                  )}
                  {isCompleted && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider">Done</span>
                  )}
                </div>
                <div className="text-xs text-fg-secondary mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 items-center font-medium">
                  <span className="text-fg-tertiary">{step.desc}</span>
                  <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-fg">{step.name}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Horizontal Timeline */}
      <div className="hidden sm:block relative mx-12 h-[170px] pt-2">
        
        {/* Track Line Background */}
        <div className="absolute left-0 right-0 top-[92px] h-1.5 bg-surface-strong dark:bg-zinc-800 rounded-full" />
        
        {/* Active Progress Fill Line */}
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${activeCoord.percent}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ left: "0%" }}
          className={cn(
            "absolute top-[92px] h-1.5 rounded-full",
            status === "Rejected" ? "bg-danger" : "bg-accent"
          )}
        />
 
        {/* Uber-Style Animated Carriage */}
        <AnimatePresence>
          {status !== "Rejected" && (
            <motion.div
              initial={{ left: "0%" }}
              animate={{ left: `${activeCoord.percent}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 14 }}
              style={{
                top: "92px",
                x: "-50%",
                y: "-50%",
              }}
              className="absolute z-30 h-10 w-10 bg-accent rounded-xl flex items-center justify-center text-accent-fg border border-accent/20 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              {status === "Paid" ? (
                <Check className="h-5 w-5 stroke-[3px]" />
              ) : (
                <FileText className="h-5 w-5 animate-pulse" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
 
        {/* Illustrated Stop Stations */}
        {steps.map((step, idx) => {
          const isCurrent = idx === activeIndex;
          const isCompleted = step.completed;
          const isRejected = (step as any).rejected;
          const isSelected = selectedStep === idx;
          const StepIcon = stepIcons[step.key as keyof typeof stepIcons] || FileText;
 
          return (
            <div
              key={step.key}
              style={{ left: `${step.percent}%` }}
              className="absolute -translate-x-1/2 flex flex-col items-center z-10 w-[130px] cursor-pointer"
              onClick={() => setSelectedStep(idx)}
            >
              {/* Station Circle Node (positioned at top) */}
              <div className="absolute top-[12px] flex flex-col items-center">
                <div
                  className={cn(
                    "h-14 w-14 rounded-full border-2 flex items-center justify-center bg-card transition-all duration-300 shadow-sm relative overflow-hidden",
                    isSelected 
                      ? "ring-2 ring-accent ring-offset-2 dark:ring-offset-zinc-950 scale-110" 
                      : "hover:scale-105",
                    isCompleted
                      ? "border-emerald-500 text-emerald-500 dark:border-emerald-400 bg-emerald-50/20 dark:bg-emerald-500/10"
                      : isRejected
                      ? "border-danger text-danger bg-danger-bg"
                      : isCurrent
                      ? "border-accent text-accent scale-105"
                      : "border-border-strong text-fg-tertiary dark:border-zinc-800"
                  )}
                >
                  <StepIcon className="h-6 w-6 stroke-[2px]" />
                  
                  {/* Ping Animation for Active Node */}
                  {isCurrent && (
                    <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                    </span>
                  )}
                </div>
 
                {/* Step Emoji Corner Badge */}
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-0.5 border border-border-strong dark:border-zinc-800 shadow-sm flex items-center justify-center overflow-hidden h-6 w-6 text-[11px]">
                  {step.emoji}
                </div>
              </div>
 
              {/* Vertical connector line */}
              <div className="absolute top-[68px] h-[15px] w-px border-l border-dashed border-border-strong dark:border-zinc-800/80" />
 
              {/* Anchor Dot on the track line */}
              <div
                className={cn(
                  "absolute top-[87px] h-2.5 w-2.5 rounded-full border bg-card transition-all duration-500 z-20",
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500"
                    : isRejected
                    ? "border-danger bg-danger"
                    : isCurrent
                    ? "border-accent bg-accent scale-110"
                    : "border-border-strong dark:border-zinc-800"
                )}
              />
 
              {/* Stop Station Labels below node */}
              <div className={cn(
                "absolute top-[108px] flex flex-col items-center px-2.5 py-1 rounded-xl border shadow-sm leading-tight text-center w-[120px] max-w-[120px] backdrop-blur-md transition-all duration-200",
                isSelected 
                  ? "bg-white dark:bg-black/45 border-accent/40 scale-105" 
                  : "bg-white/70 dark:bg-black/30 border-border dark:border-white/5"
              )}>
                <span className={cn(
                  "text-xs font-bold tracking-tight break-words block w-full", 
                  isCurrent ? "text-fg" : isCompleted ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : isRejected ? "text-danger" : "text-fg-tertiary"
                )}>
                  {step.label}
                </span>
                <span className="text-[10px] text-fg-secondary truncate block w-full font-medium mt-0.5">
                  {step.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Step Details Sub-Card */}
      {!hideDetails && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-6 border-t border-border/60 dark:border-white/5 pt-5 text-left"
          >
            <div className="flex items-center gap-2 mb-3.5">
              <div className="h-7 w-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold">
                {selectedStep === 0 ? <FileText className="h-4 w-4" /> :
                 selectedStep === 1 ? <Cpu className="h-4 w-4" /> :
                 selectedStep === 2 ? <UserCheck className="h-4 w-4" /> :
                 <CreditCard className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-fg uppercase tracking-wider leading-tight">
                  {steps[selectedStep].label} Detailed Status
                </h3>
                <p className="text-[10px] text-fg-secondary font-medium leading-tight mt-0.5">
                  {selectedStep === 0 ? "Ingestion and validation checks performed at receipt upload" :
                   selectedStep === 1 ? "Artificial Intelligence OCR reading and compliance matching" :
                   selectedStep === 2 ? "Approval checkpoint and digital signatures by the operations manager" :
                   "Citibank FAST payout settlement and ledger bookkeeping details"}
                </p>
              </div>
            </div>
            
            <div className="bg-white/[0.02] dark:bg-black/[0.06] rounded-2xl border border-border/40 dark:border-white/5 p-4">
              {renderSelectedDetails()}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
