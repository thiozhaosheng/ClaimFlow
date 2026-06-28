"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  animate,
  useMotionValue,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
  AnimatePresence,
  useSpring,
} from "motion/react";
import { cn } from "@/lib/cn";
import {
  ScanLine,
  ShieldCheck,
  GitBranch,
  Banknote,
  FileSearch,
  ArrowRight,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Reveal, Magnetic } from "./motion-primitives";
import { ClaimFlowLogo, GrabLogo, PayNowLogo, DBSLogo } from "./logo";

/* ---------------------------------------------------------------- marquee -- */

const MARQUEE = [
  "OCR receipt capture",
  "Autofill extraction",
  "IRAS policy engine",
  "Auto-approval",
  "GIRO / PayNow payout",
  "Immutable audit trail",
  "PDPA aligned",
  "GST-ready",
];

export function TrustMarquee() {
  return (
    <section className="relative overflow-hidden py-4 max-w-5xl mx-auto px-6">
      <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/[0.04] dark:bg-white/[0.01] py-4 px-6 backdrop-blur-md overflow-hidden shadow-sm relative">
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-canvas to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-canvas to-transparent z-10 pointer-events-none" />
        <div className="flex w-max animate-[marquee_32s_linear_infinite] gap-10 pr-10">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span
              key={i}
              className="flex items-center gap-3 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-fg-secondary"
            >
              {m}
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/50" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------- how it works (steps) */

const STEPS = [
  {
    title: "AI Receipt Extraction",
    body: "Snap a receipt or drop an invoice. ClaimFlow uses Azure Document Intelligence to parse merchant names, total amounts, GST 9% line items, and transaction dates in under a second.",
    image: "/apple_step_ocr.png",
    highlights: ["99.4% OCR precision", "Automated GST 9% separation", "Smart category classification"]
  },
  {
    title: "IRAS Policy Compliance Guard",
    body: "Every claim is scored against Singapore IRAS compliance guidelines and custom corporate thresholds. Routine claims are auto-approved instantly.",
    image: "/apple_step_policy.png",
    highlights: ["IRAS audit compliant", "Receipt thresholds (e.g. >$50)", "Custom department ceilings"]
  },
  {
    title: "GIRO & PayNow SME Disbursements",
    body: "Admins process payouts reconciled automatically. Payouts are made directly into bank accounts via GIRO or PayNow corporate transfers.",
    image: "/apple_step_payout.png",
    highlights: ["One-click GIRO bank export", "Instant PayNow payouts", "Immutable audit ledger trail"]
  }
];

// Active receipt data mapping for the interactive OCR simulator
const RECEIPTS_DATA = {
  grab: {
    merchant: "GRAB TAXI SG",
    total: "S$18.20",
    gst: "S$1.50",
    date: "25 Jun 2026",
    items: ["1x TAXI RIDE DISPATCH", "1x PEAK SURCHARGE"]
  },
  dinner: {
    merchant: "JUMBO SEAFOOD",
    total: "S$124.50",
    gst: "S$10.28",
    date: "24 Jun 2026",
    items: ["1x CHILI CRAB SPECIAL", "1x PEANUTS & TEA"]
  },
  supplies: {
    merchant: "POPULAR BOOKSTORE",
    total: "S$34.90",
    gst: "S$2.88",
    date: "22 Jun 2026",
    items: ["1x A4 WHITE PAPER BATCH", "1x GEL PENS"]
  }
};

function AnimatedScore({ score }: { score: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(score);
  const [displayValue, setDisplayValue] = useState(score);

  useEffect(() => {
    if (reduce) {
      setTimeout(() => setDisplayValue(score), 0);
      return;
    }
    const controls = animate(mv, score, {
      duration: 0.5,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      }
    });
    return () => controls.stop();
  }, [score, reduce, mv]);

  return <>{displayValue}%</>;
}

export function HowItWorks() {
  const reduce = useReducedMotion();

  // Milestone 01 State: OCR Receipt Scanner
  const [activeReceipt, setActiveReceipt] = useState<'grab' | 'dinner' | 'supplies'>('grab');
  const [scanning, setScanning] = useState(false);

  // Milestone 02 State: Compliance Audit Rules
  const [noReceipt, setNoReceipt] = useState(false);
  const [overLimit, setOverLimit] = useState(false);
  const [personalMeal, setPersonalMeal] = useState(false);

  // Calculate dynamic compliance score
  let score = 100;
  if (noReceipt) score -= 40;
  if (overLimit) score -= 30;
  if (personalMeal) score -= 30;

  // Milestone 03 State: PayNow Payouts & GIRO Export
  const [payoutMethod, setPayoutMethod] = useState<'paynow' | 'giro'>('paynow');
  const [payoutStatus, setPayoutStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [payoutProgress, setPayoutProgress] = useState(0);
  const [giroStatus, setGiroStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [giroProgress, setGiroProgress] = useState(0);

  const handlePayNow = () => {
    setPayoutStatus('processing');
    setPayoutProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setPayoutProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setPayoutStatus('done');
      }
    }, 100);
  };

  const handleGiroExport = () => {
    setGiroStatus('processing');
    setGiroProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setGiroProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setGiroStatus('done');
      }
    }, 100);
  };

  return (
    <section id="how" className="relative mx-auto max-w-5xl px-6 py-28">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
          The Flow
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">
          Receipt in. Reimbursement out. Fully automated.
        </h2>
      </Reveal>

      {/* Apple Bento Grid layout */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Bento Box 1: AI Receipt Extraction (Double Width) */}
        <Reveal className="md:col-span-2" i={0}>
          <div className="group relative overflow-visible rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/[0.04] dark:bg-zinc-900/10 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 hover:bg-white/[0.08] dark:hover:bg-zinc-900/20 hover:shadow-[0_24px_48px_rgba(99,102,241,0.06)] transition-all duration-500 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/[0.03] to-cyan-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
            
            <div className="flex-1 text-left max-w-md relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Milestone 01</span>
              <h3 className="text-2xl font-black text-fg tracking-tight mt-2">AI Receipt Extraction</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                Snap a receipt or drop an invoice. ClaimFlow parses merchant names, total amounts, GST 9% line items, and transaction dates in under a second using Azure Document Intelligence.
              </p>
              
              {/* Segmented Receipt Picker Tabs with Sliding Background Pill */}
              <div className="mt-5 flex bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-full border border-zinc-200 dark:border-zinc-800/80 w-fit relative z-25" onClick={(e) => e.stopPropagation()}>
                {(['grab', 'dinner', 'supplies'] as const).map((type) => {
                  const active = activeReceipt === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setScanning(true);
                        setActiveReceipt(type);
                        setTimeout(() => setScanning(false), 1200);
                      }}
                      className={cn(
                        "relative px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer z-10 focus:outline-none",
                        active ? "text-white" : "text-zinc-500 hover:text-fg"
                      )}
                    >
                      {active && (
                        <motion.div 
                          layoutId="activeReceiptTab"
                          className="absolute inset-0 bg-indigo-600 rounded-full -z-10 shadow-sm"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Scanner Widget */}
            <div className="flex-1 w-full flex items-center justify-center relative z-10 shrink-0 select-none">
              <div className="relative w-full max-w-md h-[260px] flex items-center justify-center p-2 overflow-visible">
                {/* Transparent Mascot on the Right */}
                <img 
                  src="/singapore_employee_cafecap.png" 
                  alt="SME Employee" 
                  className="w-[155px] sm:w-[220px] md:w-[240px] lg:w-[260px] h-auto object-contain absolute right-0 -bottom-6 z-10 opacity-95 transition-transform duration-300 group-hover:scale-[1.05] drop-shadow-[0_20px_30px_rgba(0,0,0,0.15)]"
                />

                {/* Simulated Paper Receipt on the Left */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeReceipt}
                    initial={{ opacity: 0, y: 35, rotate: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, rotate: -2, scale: 1 }}
                    exit={{ opacity: 0, y: -25, rotate: 2, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="w-[140px] sm:w-[160px] bg-white text-zinc-900 p-4 rounded-xl shadow-2xl border border-zinc-200 flex flex-col gap-1.5 font-mono text-[10px] relative z-20 mr-20 sm:mr-28 shrink-0 select-none cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center font-bold border-b border-dashed border-zinc-300 pb-2 mb-0.5 text-zinc-800">
                      <span className="block text-[11px] font-sans tracking-tight font-black uppercase">{RECEIPTS_DATA[activeReceipt].merchant}</span>
                      <span className="block text-[8px] text-zinc-400 mt-0.5">UEN: T09LL8023E · SINGAPORE</span>
                    </div>
                    {RECEIPTS_DATA[activeReceipt].items.map((item, idx) => (
                      <div key={idx} className="flex justify-between font-semibold text-zinc-700">
                        <span>{item}</span>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-zinc-300 pt-2 mt-0.5 flex justify-between font-bold text-[11px] font-sans text-zinc-850">
                      <span>TOTAL</span>
                      <span>{RECEIPTS_DATA[activeReceipt].total}</span>
                    </div>
                    <div className="text-[8px] text-zinc-400 text-center font-medium mt-1">
                      GST 9% INCLUDED ({RECEIPTS_DATA[activeReceipt].gst})<br />
                      DATE: {RECEIPTS_DATA[activeReceipt].date}
                    </div>

                    {/* Laser Beam Scanner */}
                    {scanning && (
                      <motion.div
                        animate={{ top: ["8%", "88%", "8%"] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute left-1 right-1 h-5 border-2 border-emerald-500 bg-emerald-500/15 rounded-md shadow-[0_0_8px_rgba(16,185,129,0.5)] pointer-events-none flex items-center justify-center"
                      >
                        <span className="text-[8px] font-sans font-black text-emerald-600 uppercase tracking-widest animate-pulse">Scanning</span>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Floating Extracted Data Pill */}
                <AnimatePresence mode="wait">
                  {!scanning && (
                    <motion.div
                      key={activeReceipt}
                      initial={{ opacity: 0, x: 20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -10, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="absolute right-2 sm:-right-8 -top-4 bg-white/95 dark:bg-zinc-950/95 border border-border dark:border-zinc-800 p-3.5 rounded-2xl shadow-2xl flex flex-col gap-1.5 backdrop-blur-md text-xs w-[130px] sm:w-[145px] text-left z-30 font-sans text-fg transition-all"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold border-b border-border dark:border-zinc-800 pb-1.5 mb-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Extracted JSON
                      </div>
                      <div className="font-mono text-[10px] text-fg-secondary dark:text-zinc-400 flex flex-col gap-0.5">
                        <div><span className="text-fg-tertiary dark:text-zinc-500">mch:</span> <strong className="text-fg dark:text-white font-semibold truncate block">{RECEIPTS_DATA[activeReceipt].merchant}</strong></div>
                        <div><span className="text-fg-tertiary dark:text-zinc-500">tot:</span> <strong className="text-fg dark:text-white font-semibold">{RECEIPTS_DATA[activeReceipt].total}</strong></div>
                        <div><span className="text-fg-tertiary dark:text-zinc-500">gst:</span> <strong className="text-fg dark:text-white font-semibold">{RECEIPTS_DATA[activeReceipt].gst}</strong></div>
                      </div>
                      <div className="mt-1 text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-semibold self-start uppercase">
                        99.4% Match
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Bento Box 2: IRAS Policy Compliance Shield (Single Width) */}
        <Reveal i={1}>
          <div className="group h-full relative overflow-visible rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/[0.04] dark:bg-zinc-900/10 p-8 flex flex-col justify-between hover:bg-white/[0.08] dark:hover:bg-zinc-900/20 hover:shadow-[0_24px_48px_rgba(20,184,166,0.06)] transition-all duration-500 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
            
            <div className="text-left relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Milestone 02</span>
              <h3 className="text-2xl font-black text-fg tracking-tight mt-2">IRAS Policy Compliance</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                Every claim is scored against Singapore IRAS compliance guidelines and custom corporate thresholds. Routine claims are auto-approved instantly.
              </p>
            </div>

            {/* Interactive Policy Checklist and Gauge Widget */}
            <div className="mt-8 w-full flex items-center justify-center relative z-10 shrink-0 select-none">
              <div className="relative w-full max-w-sm h-[260px] flex items-center justify-center p-4 overflow-visible">
                {/* Mascot on the Right */}
                <img 
                  src="/singapore_auditor_check.png" 
                  alt="Compliance Auditor" 
                  className="w-[145px] sm:w-[200px] md:w-[150px] lg:w-[235px] xl:w-[255px] h-auto object-contain absolute right-0 -bottom-6 z-10 opacity-95 transition-transform duration-300 group-hover:scale-[1.05] drop-shadow-[0_20px_30px_rgba(0,0,0,0.15)]"
                />

                {/* Score panel & toggles on the Left */}
                <div className="flex flex-col gap-2.5 flex-1 mr-20 sm:mr-24 md:mr-20 lg:mr-28 xl:mr-32 relative z-20 overflow-visible text-left">
                  {/* Gauge */}
                  <div className="bg-white dark:bg-zinc-950/90 border border-zinc-250 dark:border-zinc-850 p-3 rounded-xl flex items-center gap-3 shadow-2xl">
                    <div className="relative h-11 w-11 flex items-center justify-center">
                      <svg className="h-full w-full -rotate-90">
                        <circle cx="22" cy="22" r="18" className="stroke-zinc-200 dark:stroke-zinc-800 fill-none stroke-[3]" />
                        <motion.circle 
                          cx="22" 
                          cy="22" 
                          r="18" 
                          className={cn(
                            "fill-none stroke-[3]",
                            score === 100 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-rose-500"
                          )}
                          strokeDasharray={2 * Math.PI * 18}
                          animate={{ strokeDashoffset: (2 * Math.PI * 18) * (1 - score / 100) }}
                          transition={{ type: "spring", stiffness: 120, damping: 12 }}
                        />
                      </svg>
                      <span className="absolute text-xs font-black text-fg">
                        <AnimatedScore score={score} />
                      </span>
                    </div>
                    <div className="text-left font-sans">
                      <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400 block">Audit Score</span>
                      <strong className={cn(
                        "text-[11px] font-bold block",
                        score === 100 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-rose-500"
                      )}>
                        {score === 100 ? "IRAS OK" : score >= 50 ? "WARNINGS" : "REJECTED"}
                      </strong>
                    </div>
                  </div>

                  {/* Switch list with interactive iOS Toggles */}
                  <div className="bg-white dark:bg-zinc-950/80 border border-zinc-250 dark:border-zinc-850 p-3.5 rounded-xl flex flex-col gap-2.5 text-xs text-left shadow-2xl">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setNoReceipt(!noReceipt); }}
                      className="flex items-center justify-between w-full group cursor-pointer text-left focus:outline-none"
                    >
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium text-xs group-hover:text-fg transition-colors">Missing receipt</span>
                      <div className={cn("w-8 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0", noReceipt ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800")}>
                        <motion.div 
                          className="w-4 h-4 bg-white rounded-full shadow"
                          animate={{ x: noReceipt ? 12 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOverLimit(!overLimit); }}
                      className="flex items-center justify-between w-full group cursor-pointer text-left focus:outline-none"
                    >
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium text-xs group-hover:text-fg transition-colors">Exceed S$100 cap</span>
                      <div className={cn("w-8 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0", overLimit ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800")}>
                        <motion.div 
                          className="w-4 h-4 bg-white rounded-full shadow"
                          animate={{ x: overLimit ? 12 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPersonalMeal(!personalMeal); }}
                      className="flex items-center justify-between w-full group cursor-pointer text-left focus:outline-none"
                    >
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium text-xs group-hover:text-fg transition-colors">Personal charge</span>
                      <div className={cn("w-8 h-5 rounded-full p-0.5 transition-colors duration-200 shrink-0", personalMeal ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800")}>
                        <motion.div 
                          className="w-4 h-4 bg-white rounded-full shadow"
                          animate={{ x: personalMeal ? 12 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Bento Box 3: GIRO & PayNow Disbursements (Single Width) */}
        <Reveal i={2}>
          <div className="group h-full relative overflow-visible rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/[0.04] dark:bg-zinc-900/10 p-8 flex flex-col justify-between hover:bg-white/[0.08] dark:hover:bg-zinc-900/20 hover:shadow-[0_24px_48px_rgba(233,30,99,0.06)] transition-all duration-500 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-b from-pink-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
            
            <div className="text-left relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">Milestone 03</span>
              <h3 className="text-2xl font-black text-fg tracking-tight mt-2">Instant Payout Settlement</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                Admins process payouts reconciled automatically. Payouts are made directly into bank accounts via GIRO or PayNow corporate transfers.
              </p>
            </div>

            {/* Interactive Payout Settlements Widget */}
            <div className="mt-8 w-full flex items-center justify-center relative z-10 shrink-0 select-none">
              <div className="relative w-full max-w-sm h-[260px] flex items-center justify-center p-4 overflow-visible">
                {/* Mascot: Finance manager holding iPad (Sticks out of card) */}
                <img 
                  src="/singapore_finance_admin.png" 
                  alt="Finance Officer" 
                  className="w-[145px] sm:w-[210px] md:w-[155px] lg:w-[240px] xl:w-[265px] h-auto object-contain absolute right-0 -bottom-6 z-10 opacity-95 transition-transform duration-300 group-hover:scale-[1.05] drop-shadow-[0_20px_30px_rgba(0,0,0,0.15)]"
                />

                {/* Dashboard Controls */}
                <div className="flex flex-col gap-2.5 flex-1 mr-20 sm:mr-24 md:mr-20 lg:mr-28 xl:mr-32 relative z-20 text-left">
                  {/* Segmented PayNow / GIRO Tab Selector with Sliding background */}
                  <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-full border border-zinc-200 dark:border-zinc-800 relative z-25 w-full shadow-inner" onClick={(e) => e.stopPropagation()}>
                    {(['paynow', 'giro'] as const).map((method) => {
                      const active = payoutMethod === method;
                      return (
                        <button
                          key={method}
                          onClick={() => { setPayoutMethod(method); setPayoutStatus('idle'); setGiroStatus('idle'); }}
                          className={cn(
                            "relative flex-1 text-center py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer z-10 focus:outline-none",
                            active ? "text-white" : "text-zinc-500 hover:text-fg"
                          )}
                        >
                          {active && (
                            <motion.div 
                              layoutId="activePayoutTab"
                              className="absolute inset-0 bg-indigo-600 rounded-full -z-10 shadow-sm"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                          {method === 'paynow' ? 'PayNow' : 'GIRO'}
                        </button>
                      );
                    })}
                  </div>

                  {/* Stateful sliding container */}
                  <div className="relative overflow-hidden w-full h-[148px]">
                    <AnimatePresence mode="wait">
                      {payoutMethod === 'paynow' ? (
                        <motion.div
                          key="paynow-panel"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="absolute inset-x-0 top-0 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col gap-2 shadow-2xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            <span>Recipient:</span>
                            <span className="text-fg font-bold">Dan Tan (*4567)</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            <span>Amount:</span>
                            <span className="text-emerald-500 font-black">S$124.50</span>
                          </div>
                          
                          <div className="mt-1">
                            <AnimatePresence mode="wait">
                              {payoutStatus === 'idle' && (
                                <motion.button 
                                  key="paynow-idle"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={handlePayNow}
                                  className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-sm active:scale-95"
                                >
                                  Disburse Now
                                </motion.button>
                              )}
                              
                              {payoutStatus === 'processing' && (
                                <motion.div 
                                  key="paynow-processing"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  className="flex flex-col gap-1.5"
                                >
                                  <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div 
                                      className="h-full bg-indigo-500" 
                                      style={{ width: `${payoutProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-black animate-pulse">Transferring: {payoutProgress}%</span>
                                </motion.div>
                              )}

                              {payoutStatus === 'done' && (
                                <motion.div 
                                  key="paynow-done"
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                  className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg text-center text-emerald-500 font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1.5"
                                >
                                  ✓ DISBURSED INSTANTLY
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="giro-panel"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="absolute inset-x-0 top-0 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl flex flex-col gap-2 shadow-2xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest">GIRO Payout Queue</span>
                          <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                            <div className="flex justify-between font-medium">
                              <span>Dan Tan</span>
                              <span className="text-emerald-500 font-semibold">✓ Ready</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Sarah Lim</span>
                              <span className="text-emerald-500 font-semibold">✓ Ready</span>
                            </div>
                          </div>
                          
                          <div className="mt-1">
                            <AnimatePresence mode="wait">
                              {giroStatus === 'idle' && (
                                <motion.button 
                                  key="giro-idle"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={handleGiroExport}
                                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer active:scale-95 shadow-sm"
                                >
                                  Export Bank File
                                </motion.button>
                              )}
                              
                              {giroStatus === 'processing' && (
                                <motion.div 
                                  key="giro-processing"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  className="flex flex-col gap-1.5"
                                >
                                  <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div 
                                      className="h-full bg-indigo-500" 
                                      style={{ width: `${giroProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-black animate-pulse">Exporting: {giroProgress}%</span>
                                </motion.div>
                              )}

                              {giroStatus === 'done' && (
                                <motion.div 
                                  key="giro-done"
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                  className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg text-center text-emerald-500 font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1.5"
                                >
                                  ✓ BATCH FILE EXPORTED
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}

/* ----------------------------------------------------------- bento features -- */

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-28 border-t border-border">
      <Reveal>
        <p className="text-sm font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
          Everything in the Loop
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">
          Designed for Singapore SMEs. Engineered like a web portal.
        </h2>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Bento Box 1: OCR scanner */}
        <BentoCard
          title="OCR receipt capture"
          badge="Azure AI"
          badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          desc="Azure Document Intelligence captures merchant, date, and GST line items in under a second."
        >
          {/* Scanning animation */}
          <div className="w-full min-h-[120px] py-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800 rounded-xl overflow-hidden relative flex items-center justify-center p-4">
            <div className="w-full flex flex-col gap-2 font-mono text-[11px] text-zinc-450 dark:text-zinc-500 relative">
              <div className="flex justify-between border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-1.5 mb-1 text-fg font-bold">
                <span>GrabTaxi SG Receipt</span>
                <span>SGD 18.20</span>
              </div>
              <div className="h-2 w-3/4 bg-zinc-200/50 dark:bg-zinc-800/50 rounded" />
              <div className="h-2 w-1/2 bg-zinc-200/50 dark:bg-zinc-800/50 rounded" />
              {/* Laser line */}
              <motion.div
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"
              />
            </div>
          </div>
        </BentoCard>

        {/* Bento Box 2: AI Autofill */}
        <BentoCard
          title="Autofill forms"
          badge="Smart Fields"
          badgeColor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          desc="Fills fields automatically without overwriting what you typed manually."
        >
          <div className="w-full min-h-[120px] py-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col justify-center gap-2 text-xs text-left">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500">Extracted Merchant</span>
              <div className="h-8 px-3 border border-indigo-500/30 bg-indigo-500/5 rounded flex items-center font-semibold text-fg">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  GrabTaxi Holdings
                </motion.span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Bento Box 3: Policy Validation */}
        <BentoCard
          title="IRAS Audit compliance"
          badge="Policy Engine"
          badgeColor="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          desc="Singapore compliant. Separates GST 9% line items and audits company expense limits."
        >
          <div className="w-full min-h-[120px] py-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col justify-center gap-2 text-xs text-left">
            <div className="flex items-center gap-2.5">
              <span className="h-4.5 w-4.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0">✓</span>
              <span className="text-zinc-600 dark:text-zinc-300 font-semibold">GST 9% Audited & Balanced</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-4.5 w-4.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0">✓</span>
              <span className="text-zinc-600 dark:text-zinc-300 font-semibold">Within S$100 transport limit</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-4.5 w-4.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0">✓</span>
              <span className="text-zinc-600 dark:text-zinc-300 font-semibold">Original attachments verified</span>
            </div>
          </div>
        </BentoCard>

        {/* Bento Box 4: Approval routing */}
        <BentoCard
          title="Approval routing"
          badge="Workflows"
          badgeColor="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
          desc="Auto-approves claims. Routes exceptions instantly to department managers."
        >
          <div className="w-full min-h-[120px] py-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800 rounded-xl p-3 flex items-center justify-center gap-4 text-xs font-sans">
            <div className="flex flex-col items-center">
              <span className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center font-black">E</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-bold">Employee</span>
            </div>
            <span className="h-px w-6 bg-zinc-200 dark:bg-zinc-800/80" />
            <div className="flex flex-col items-center">
              <span className="h-9 w-9 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 flex items-center justify-center font-black">M</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-bold">Manager</span>
            </div>
            <span className="h-px w-6 bg-zinc-200 dark:bg-zinc-800/80" />
            <div className="flex flex-col items-center">
              <span className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-black">F</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-bold">Finance</span>
            </div>
          </div>
        </BentoCard>

        {/* Bento Box 5: Payout Settlements */}
        <BentoCard
          title="Direct GIRO & PayNow"
          badge="Payouts"
          badgeColor="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          desc="Batch payouts directly into bank accounts via PayNow Corporate transfers."
        >
          <div className="w-full min-h-[120px] py-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-center gap-2 text-xs text-left">
            <div className="flex justify-between items-center">
              <span className="font-bold text-fg">PayNow disbursement</span>
              <span className="text-emerald-550 dark:text-emerald-400 font-black text-sm">S$124.50</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-1.5">
              <motion.div
                animate={{ width: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="h-full bg-emerald-500"
              />
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5 font-semibold">Disbursed successfully</span>
          </div>
        </BentoCard>

        {/* Bento Box 6: Immutable Ledger logs */}
        <BentoCard
          title="Immutable Audit trail"
          badge="Ledger"
          badgeColor="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          desc="Immutable, exportable transaction logs tracking every approval and compliance validation."
        >
          <div className="w-full min-h-[120px] py-4 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col justify-center gap-1.5 select-none text-xs text-left font-mono overflow-hidden">
            <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 border-b border-zinc-200 dark:border-zinc-850 pb-1 mb-0.5 uppercase tracking-wider">Audit Event Ledger</div>
            <div className="flex justify-between text-zinc-500 font-semibold">
              <span>GrabTaxi UEN Claim Submitted</span>
              <span className="text-emerald-550 font-bold">[OK]</span>
            </div>
            <div className="flex justify-between text-zinc-500 font-semibold">
              <span>IRAS Policy Rules Run</span>
              <span className="text-emerald-550 font-bold">[PASS]</span>
            </div>
            <div className="flex justify-between text-zinc-500 font-semibold">
              <span>PayNow Disbursement Complete</span>
              <span className="text-emerald-550 font-bold">[PAID]</span>
            </div>
          </div>
        </BentoCard>

      </div>
    </section>
  );
}

function BentoCard({
  title,
  badge,
  badgeColor,
  desc,
  children,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  desc: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  // Mouse move motion values for smooth hardware-accelerated spring animations
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springX = useSpring(mouseX, { stiffness: 120, damping: 25, mass: 0.4 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 25, mass: 0.4 });

  const rotateX = useTransform(springY, [0, 1], [4, -4]);
  const rotateY = useTransform(springX, [0, 1], [-4, 4]);

  return (
    <Reveal>
      <motion.div
        style={
          reduce
            ? undefined
            : {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                perspective: 800,
              }
        }
        onMouseMove={(e) => {
          if (reduce) return;
          const rect = e.currentTarget.getBoundingClientRect();
          mouseX.set((e.clientX - rect.left) / rect.width);
          mouseY.set((e.clientY - rect.top) / rect.height);
        }}
        onMouseLeave={() => {
          mouseX.set(0.5);
          mouseY.set(0.5);
        }}
        className="group h-full relative overflow-hidden rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/[0.04] dark:bg-zinc-900/10 p-7 transition-[background-color,border-color,box-shadow,opacity] duration-500 backdrop-blur-md hover:bg-white/[0.08] dark:hover:bg-zinc-900/20 will-change-transform flex flex-col justify-between gap-5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] text-left"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-white/[0.03] dark:from-zinc-900/[0.01] dark:to-zinc-900/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex justify-between items-center gap-4">
            <h3 className="text-xl font-bold tracking-tight text-fg">{title}</h3>
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0", badgeColor)}>
              {badge}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-fg-secondary mt-1">{desc}</p>
        </div>

        <div className="relative z-10 w-full mt-2">
          {children}
        </div>
      </motion.div>
    </Reveal>
  );
}

/* -------------------------------------------------------------- stats band -- */

function CountUp({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  // Driven by a Framer Motion value (not React state), so there's no
  // setState-in-effect and the text updates straight from the animation.
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) =>
    v.toLocaleString("en-SG", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [inView, to, reduce, mv]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{text}</motion.span>
      {suffix}
    </span>
  );
}

const STATS = [
  { value: 92, suffix: "%", label: "claims auto-approved in policy" },
  { value: 14, suffix: " min", label: "median receipt-to-payout" },
  { value: 100, suffix: "%", label: "actions written to the audit trail" },
];

export function Stats() {
  return (
    <section id="proof" className="mx-auto max-w-5xl px-6 py-24">
      <div className="grid grid-cols-1 gap-10 rounded-3xl border border-white/20 dark:border-white/10 bg-white/[0.08] dark:bg-black/[0.15] px-8 py-14 sm:grid-cols-3 backdrop-blur-3xl saturate-210 shadow-[0_16px_40px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.4)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {STATS.map((s, i) => (
          <Reveal key={s.label} i={i} className="text-center">
            <p className="bg-gradient-to-b from-fg to-fg/70 bg-clip-text text-transparent text-5xl font-semibold tracking-tight">
              <CountUp to={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-3 text-sm text-fg-secondary">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- cta -- */

export function CTA() {
  const reduce = useReducedMotion();

  const ctaX = useMotionValue(0.5);
  const ctaY = useMotionValue(0.5);

  const ctaXSpring = useSpring(ctaX, { stiffness: 80, damping: 22 });
  const ctaYSpring = useSpring(ctaY, { stiffness: 80, damping: 22 });

  const ctaRotateX = useTransform(ctaYSpring, [0, 1], [10, -10]);
  const ctaRotateY = useTransform(ctaXSpring, [0, 1], [-10, 10]);

  const ctaImgX = useTransform(ctaXSpring, [0, 1], [-12, 12]);
  const ctaImgY = useTransform(ctaYSpring, [0, 1], [-12, 12]);

  const ctaBadgeX = useTransform(ctaXSpring, [0, 1], [-25, 25]);
  const ctaBadgeY = useTransform(ctaYSpring, [0, 1], [-25, 25]);

  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-28">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/20 dark:border-white/10 px-8 py-12 md:py-16 md:px-12 bg-white/[0.08] dark:bg-black/[0.15] shadow-[0_24px_64px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.4)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-3xl saturate-210">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(80%_120%_at_70%_0%,rgba(99,102,241,0.08),transparent_70%)] dark:bg-[radial-gradient(80%_120%_at_70%_0%,rgba(99,102,241,0.18),transparent_70%)]"
        />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 text-center md:text-left">
            <Reveal>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-fg sm:text-4xl lg:text-5xl leading-tight">
                Stop chasing receipts.<br />
                <span className="bg-gradient-to-r from-indigo-600 to-sky-600 dark:from-indigo-300 dark:to-sky-200 bg-clip-text text-transparent">Start settling claims.</span>
              </h2>
              <p className="mt-4 text-base text-fg-secondary max-w-md">
                See the entire flow — capture to payout — on live demo data. Reconciled and paid instantly via GIRO or PayNow.
              </p>
              <div className="mt-8 flex justify-center md:justify-start">
                <Magnetic>
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-2 rounded-xl bg-fg px-6 py-3.5 text-sm font-semibold text-canvas hover:opacity-90 transition-transform active:scale-95 duration-200"
                  >
                    Try the Demo
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
          </div>

          <div
            onMouseMove={reduce ? undefined : (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              ctaX.set((e.clientX - rect.left) / rect.width);
              ctaY.set((e.clientY - rect.top) / rect.height);
            }}
            onMouseLeave={reduce ? undefined : () => {
              ctaX.set(0.5);
              ctaY.set(0.5);
            }}
            className="md:col-span-5 flex justify-center items-center relative [perspective:1000px] cursor-pointer"
          >
            {/* The main card (CSS Desktop Browser Mockup representing success page) */}
            <motion.div 
              style={{ 
                rotateX: reduce ? 0 : ctaRotateX, 
                rotateY: reduce ? 0 : ctaRotateY,
                transformStyle: "preserve-3d"
              }}
              className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-[0_32px_96px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_48px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col font-sans text-left text-zinc-800 dark:text-zinc-200 pointer-events-none select-none relative will-change-transform"
            >
              {/* Floating PayNow Ref Pill (Now inside browser mockup) */}
              <motion.div
                style={{
                  x: reduce ? 0 : ctaImgX,
                  y: reduce ? 0 : ctaImgY,
                  transformStyle: "preserve-3d",
                  z: 75,
                }}
                animate={{
                  y: [-3, 3, -3],
                }}
                transition={{
                  duration: 4.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="hidden sm:flex absolute top-14 right-3 bg-white dark:bg-zinc-950 border border-pink-500/30 dark:border-pink-500/20 p-2.5 pr-4 rounded-xl shadow-lg items-center gap-2.5 select-none pointer-events-none z-45 w-[240px] text-left scale-[0.8] sm:scale-100 origin-top-right will-change-transform"
              >
                {/* PayNow Logo Icon */}
                <div className="h-7 w-7 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm p-0.5">
                  <img src="/logo_paynow.png" alt="PayNow Logo" className="h-full w-full object-contain" />
                </div>
                <div className="text-left leading-normal">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">PayNow Corporate</span>
                  <span className="block text-[11px] font-bold text-fg mt-0.5">Disbursed S$1,420.50 to Dan Tan</span>
                  <span className="block text-[8px] text-zinc-450 dark:text-zinc-500 mt-0.5">Ref: PN_280918023 · Reconciled</span>
                </div>
              </motion.div>

              {/* Floating DBS Sync Ledger Card (Now inside browser mockup) */}
              <motion.div
                style={{
                  x: reduce ? 0 : ctaBadgeX,
                  y: reduce ? 0 : ctaBadgeY,
                  transformStyle: "preserve-3d",
                  z: 90,
                }}
                animate={{
                  y: [3, -3, 3],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="hidden sm:flex absolute bottom-3 left-3 bg-white dark:bg-zinc-950 border border-red-500/30 dark:border-red-500/20 p-2.5 pr-4 rounded-xl shadow-lg items-center gap-2.5 select-none pointer-events-none z-45 w-[190px] text-left scale-[0.8] sm:scale-100 origin-bottom-left will-change-transform"
              >
                {/* DBS Logo Icon */}
                <div className="h-7 w-7 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm p-0.5">
                  <img src="/logo_dbs.svg" alt="DBS Logo" className="h-full w-full object-contain" />
                </div>
                <div className="text-left font-sans leading-tight">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-red-600 dark:text-red-500">DBS GL Sync</span>
                  <span className="text-[11px] font-bold text-fg block mt-0.5">Ledger Status: Balanced [OK]</span>
                </div>
              </motion.div>

              {/* Browser Header Bar */}
              <div className="h-12 px-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                </div>
                {/* Search Bar / URL */}
                <div className="h-7 w-60 rounded bg-zinc-200/40 dark:bg-zinc-900/60 border border-zinc-200/10 flex items-center justify-center text-[10px] text-zinc-500 font-medium select-none">
                  app.claimflow.sg/payouts/success
                </div>
                <div className="w-8" />
              </div>

              {/* Web Content Body */}
              <div className="flex flex-col sm:flex-row min-h-[300px]">
                {/* Minimal Web Sidebar */}
                <div className="hidden sm:flex flex-col w-[130px] border-r border-zinc-100 dark:border-zinc-900 p-4 gap-4 bg-zinc-50/10 dark:bg-zinc-900/5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <ClaimFlowLogo className="h-4.5 w-4.5" />
                    <span className="text-[10px] font-black tracking-tight text-fg">ClaimFlow</span>
                  </div>
                  <nav className="flex flex-col gap-1 mt-1">
                    <span className="px-2 py-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Payments</span>
                    <span className="px-2 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold">Disbursed</span>
                    <span className="px-2 py-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">Ledger Sync</span>
                  </nav>
                </div>

                {/* Success Payout Modal Details */}
                <div className="flex-1 p-5 flex flex-col justify-center items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.25)] border border-emerald-500/25">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-fg mt-3">Disbursement Successful</h3>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">Funds transferred instantly via PayNow Corporate</span>

                  {/* Transfer Details Card */}
                  <div className="mt-4 w-full bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-150 dark:border-zinc-900 p-4 rounded-xl flex flex-col gap-2 text-[10px] text-left">
                    <div className="flex justify-between text-zinc-500">
                      <span>Sender Bank:</span>
                      <strong className="text-fg font-semibold">ClaimFlow SME (DBS)</strong>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Recipient:</span>
                      <strong className="text-fg font-semibold">Dan Tan (PayNow proxy)</strong>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Ref ID:</span>
                      <strong className="text-fg font-semibold font-mono">PN_280918023</strong>
                    </div>
                    <div className="flex justify-between text-zinc-500 border-t border-dashed border-zinc-100 dark:border-zinc-900 pt-2 mt-1">
                      <span>Amount Disbursed:</span>
                      <strong className="text-emerald-500 font-extrabold text-xs">S$1,420.50</strong>
                    </div>
                  </div>

                  {/* Sync Status Badge */}
                  <div className="mt-3.5 flex items-center gap-1.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Balanced & Synced with QuickBooks Ledger
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <footer className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 text-xs text-fg-tertiary sm:flex-row">
        <span>© 2026 ClaimFlow · Built for Singapore SMEs</span>
        <span>PDPA + IRAS aligned</span>
      </footer>
    </section>
  );
}
