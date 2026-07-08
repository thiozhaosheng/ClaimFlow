"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { UserSession } from "@/lib/session-context";
import {
  ArrowRight,
  Mail,
  Lock,
  User,
  UserCheck,
  Wallet,
  Check,
  FileText,
  Shield,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  useTransform,
  useScroll,
  AnimatePresence,
} from "motion/react";
import { ParticleField } from "./particle-field";
import { Magnetic } from "./motion-primitives";
import { ClaimFlowLogo, GrabLogo, PayNowLogo } from "./logo";
import { Pipeline } from "./pipeline";

const DEMO_ACCOUNTS = [
  {
    role: "Employee",
    email: "demo.employee@claimflow.com",
    description: "Submit and track expense claims",
    icon: User,
  },
  {
    role: "Approving Officer",
    email: "demo.manager@claimflow.com",
    description: "Review and endorse department claims",
    icon: UserCheck,
  },
  {
    role: "Finance Admin",
    email: "demo.finance@claimflow.com",
    description: "Process payouts and view audit trail",
    icon: Wallet,
  },
];

export function Hero() {
  const reduce = useReducedMotion();
  const [preloading, setPreloading] = useState(true);
  const [showHero, setShowHero] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    if (reduce) {
      setTimeout(() => {
        setPreloading(false);
        setShowHero(true);
      }, 0);
      return;
    }
    const timer = setTimeout(() => {
      setPreloading(false);
      setShowHero(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, [reduce]);

  const mx = useMotionValue(50);
  const my = useMotionValue(30);
  const glow = useMotionTemplate`radial-gradient(40rem 40rem at ${mx}% ${my}%, rgba(99,102,241,0.14), transparent 60%)`;

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Scrub directly off native scroll (no spring) so the fold tracks the wheel
  // 1:1 with zero added latency — crisper, and less main-thread work per frame.
  const mockupScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.92]);
  const mockupRotateX = useTransform(scrollYProgress, [0, 0.5], [0, 6]);
  const mockupYOffset = useTransform(scrollYProgress, [0, 0.5], [0, 40]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const mouseXSpring = useSpring(x, { stiffness: 80, damping: 22 });
  const mouseYSpring = useSpring(y, { stiffness: 80, damping: 22 });

  const rotateX = useTransform(mouseYSpring, [0, 1], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [0, 1], [-10, 10]);

  const imgX = useTransform(mouseXSpring, [0, 1], [-12, 12]);
  const imgY = useTransform(mouseYSpring, [0, 1], [-12, 12]);

  const badge1X = useTransform(mouseXSpring, [0, 1], [-25, 25]);
  const badge1Y = useTransform(mouseYSpring, [0, 1], [-25, 25]);

  const badge2X = useTransform(mouseXSpring, [0, 1], [-35, 35]);
  const badge2Y = useTransform(mouseYSpring, [0, 1], [-35, 35]);

  const shieldX = useTransform(mouseXSpring, [0, 1], [-20, 20]);
  const shieldY = useTransform(mouseYSpring, [0, 1], [-20, 20]);

  return (
    <>
      <section
      ref={containerRef}
      className="relative overflow-hidden"
      onMouseMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
    >
      {/* animated aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        <div className="aurora absolute -top-40 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full opacity-50 blur-[120px]" />
      </div>
      {/* mouse-reactive glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: glow }}
      />
      {/* particles */}
      <ParticleField className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-70" />
      {/* grid lines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-60 dark:opacity-30 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />

      <div className="mx-auto max-w-5xl flex flex-col items-center text-center px-6 pt-8 pb-4 sm:pt-16 sm:pb-6 md:pt-20 md:pb-8">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={showHero ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 dark:border-white/10 bg-white/[0.08] dark:bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-fg-secondary backdrop-blur-md"
        >
          <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          Automated claims, settled at the speed of trust
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={showHero ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 sm:mt-2.5 text-balance text-3xl sm:text-6xl lg:text-[4.5rem] font-black leading-[1.02] tracking-tighter text-fg"
        >
          Snap a receipt.
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 dark:from-indigo-400 dark:via-sky-400 dark:to-emerald-400 bg-clip-text text-transparent font-extrabold">
            Get reimbursed.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={showHero ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 sm:mt-2.5 max-w-xl text-xs sm:text-base leading-relaxed text-fg-secondary font-medium"
        >
          ClaimFlow reads the receipt, fills the claim, checks it against IRAS
          policy, routes the approval, and pays out by GIRO/PayNow — while you
          do nothing.
        </motion.p>

        {/* Center CTA button pair */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={showHero ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 sm:mt-3.5 flex flex-row gap-2.5 sm:gap-3 items-center justify-center w-full"
        >
          <Magnetic strength={0.3}>
            <Link
              href="/login"
              className="group inline-flex h-9.5 sm:h-11 items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-fg px-4 sm:px-6 text-xs sm:text-sm font-semibold text-canvas hover:opacity-95 hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] active:scale-95 transition-all duration-200"
            >
              Try the Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Magnetic>
          <Magnetic strength={0.2}>
            <button
              onClick={() => setShowVideoModal(true)}
              className="inline-flex h-9.5 sm:h-11 items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-white/20 dark:border-white/10 bg-white/[0.04] dark:bg-white/[0.01] hover:bg-white/[0.08] px-4 sm:px-6 text-xs sm:text-sm font-semibold text-fg transition-all active:scale-95 duration-200 cursor-pointer"
            >
              Watch how it works
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            </button>
          </Magnetic>
        </motion.div>

        {/* Stats strip centered */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={showHero ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 flex flex-row items-center justify-center gap-3.5 sm:gap-10 rounded-2xl border border-white/20 dark:border-white/10 bg-white/[0.08] dark:bg-white/[0.03] p-2 sm:p-3.5 px-4 sm:px-6 text-[10px] sm:text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_-4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_32px_-4px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150"
        >
          <div className="text-center">
            <strong className="block sm:inline mr-0.5 text-xs sm:text-base font-bold text-fg">~12 min</strong>
            <span className="text-[8px] sm:text-[10px] text-fg-secondary font-medium block sm:inline">avg approval</span>
          </div>
          <div className="h-6 sm:h-8 w-px bg-border/85" />
          <div className="text-center">
            <strong className="block sm:inline mr-0.5 text-xs sm:text-base font-bold text-fg">87%</strong>
            <span className="text-[8px] sm:text-[10px] text-fg-secondary font-medium block sm:inline">auto-approved</span>
          </div>
          <div className="h-6 sm:h-8 w-px bg-border/85" />
          <div className="text-center">
            <strong className="block sm:inline mr-0.5 text-xs sm:text-base font-bold text-fg">PDPA + IRAS</strong>
            <span className="text-[8px] sm:text-[10px] text-fg-secondary font-medium block sm:inline">compliant</span>
          </div>
        </motion.div>

        {/* Floating centered device mockup graphics with scroll-linked 3D fold */}
        <motion.div
          style={{
            scale: reduce ? 1 : mockupScale,
            rotateX: reduce ? 0 : mockupRotateX,
            y: reduce ? 0 : mockupYOffset,
            opacity: mockupOpacity,
            perspective: 1000,
            transformStyle: "preserve-3d",
          }}
          onMouseMove={reduce ? undefined : (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            x.set((e.clientX - rect.left) / rect.width);
            y.set((e.clientY - rect.top) / rect.height);
          }}
          onMouseLeave={reduce ? undefined : () => {
            x.set(0.5);
            y.set(0.5);
          }}
          className="mt-8 w-full max-w-3xl relative flex items-center justify-center will-change-transform"
        >
          {/* The CSS macOS Window Mockup (floating borderlessly and completely readable) */}
          <motion.div
            style={{
              rotateX: reduce ? 0 : rotateX,
              rotateY: reduce ? 0 : rotateY,
              x: reduce ? 0 : imgX,
              y: reduce ? 0 : imgY,
              z: 45,
              transformStyle: "preserve-3d",
            }}
            className="w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-[0_32px_96px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_48px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col font-sans text-left text-zinc-800 dark:text-zinc-200 pointer-events-none select-none relative will-change-transform"
          >
            {/* Contained Floating Card 1: Top Left (Grab) */}
            <motion.div
              style={{
                x: reduce ? 0 : badge1X,
                y: reduce ? 0 : badge1Y,
                transformStyle: "preserve-3d",
                z: 80,
              }}
              animate={{
                y: [-6, 6, -6],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="hidden sm:flex absolute top-14 left-4 bg-white dark:bg-zinc-950 border border-[#00B14F]/30 dark:border-[#00B14F]/20 p-2.5 pr-4 rounded-xl shadow-lg items-center gap-2.5 select-none pointer-events-none z-50 w-[220px] text-left scale-[0.8] sm:scale-100 origin-top-left will-change-transform"
            >
              {/* Grab Brand Accent Icon */}
              <div className="h-9 w-9 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm p-1">
                <img src="/logo_grab.svg" alt="Grab Logo" className="h-full w-full object-contain" />
              </div>
              <div className="text-left font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00B14F]">GrabTaxi SG</span>
                  <span className="px-1 py-0.2 bg-[#00B14F]/10 text-[#00B14F] text-[8px] font-bold rounded">Verified</span>
                </div>
                <span className="block text-sm font-bold text-fg mt-0.5">Taxi ride: S$18.20</span>
                <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Confidence: 99.4% · OCR Sync</span>
              </div>
            </motion.div>

            {/* Contained Floating Card 2: Bottom Right (PayNow) */}
            <motion.div
              style={{
                x: reduce ? 0 : badge2X,
                y: reduce ? 0 : badge2Y,
                transformStyle: "preserve-3d",
                z: 95,
              }}
              animate={{
                y: [6, -6, 6],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="hidden sm:flex absolute bottom-4 right-4 bg-white dark:bg-zinc-950 border border-pink-500/30 dark:border-pink-500/20 p-2.5 pr-4 rounded-xl shadow-lg items-center gap-2.5 select-none pointer-events-none z-50 w-[240px] text-left scale-[0.8] sm:scale-100 origin-bottom-right will-change-transform"
            >
              {/* PayNow Brand Accent Icon */}
              <div className="h-9 w-9 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm p-1">
                <img src="/logo_paynow.png" alt="PayNow Logo" className="h-full w-full object-contain" />
              </div>
              <div className="text-left font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">PayNow Instant</span>
                  <span className="px-1 py-0.2 bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[8px] font-bold rounded">Reconciled</span>
                </div>
                <span className="block text-sm font-bold text-fg mt-0.5">S$124.50 sent to Dan Tan</span>
                <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Ref: DBS-TXN9402 · Paid</span>
              </div>
            </motion.div>

            {/* Contained Floating Card 3: Top Right (Compliance Guard) */}
            <motion.div
              style={{
                x: reduce ? 0 : shieldX,
                y: reduce ? 0 : shieldY,
                transformStyle: "preserve-3d",
                z: 65,
              }}
              animate={{
                y: [-4, 4, -4],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="hidden sm:flex absolute top-14 right-4 bg-white dark:bg-zinc-950 border border-teal-500/30 dark:border-teal-500/20 p-2.5 pr-4 rounded-xl shadow-lg items-center gap-2.5 select-none pointer-events-none z-50 w-[190px] text-left scale-[0.8] sm:scale-100 origin-top-right will-change-transform"
            >
              {/* Compliance Guard Icon */}
              <div className="h-9 w-9 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-left font-sans">
                <span className="block text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">Compliance Guard</span>
                <span className="text-sm font-bold text-fg block mt-0.5">IRAS Policy Approved</span>
              </div>
            </motion.div>
            {/* Window Title Bar */}
            <div className="h-11 px-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              {/* Window controls */}
              <div className="flex gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
              </div>
              {/* Title */}
              <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                app.claimflow.sg — SME Portal
              </div>
              <div className="w-12" />
            </div>

            {/* Main Window Dashboard Body */}
            <div className="flex flex-col sm:flex-row min-h-[290px] bg-white dark:bg-zinc-950">
              {/* Sidebar */}
              <div className="hidden sm:flex flex-col w-[170px] border-r border-zinc-100 dark:border-zinc-900 p-5 gap-5 bg-zinc-50/20 dark:bg-zinc-900/5">
                <div className="flex items-center gap-2.5">
                  <ClaimFlowLogo className="h-6 w-6" />
                  <span className="text-sm font-bold tracking-tight text-fg">ClaimFlow</span>
                </div>
                <nav className="flex flex-col gap-1.5 mt-2">
                  <span className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-bold text-fg">Dashboard</span>
                  <span className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 font-semibold hover:text-fg transition-colors">Claims Queue</span>
                  <span className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 font-semibold hover:text-fg transition-colors">Policy Rules</span>
                  <span className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 font-semibold hover:text-fg transition-colors">Disbursements</span>
                </nav>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3 sm:pb-4">
                  <div>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Claims Summary</span>
                    <h3 className="text-lg font-bold text-fg mt-0.5">Reimbursements Queue</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Auto-Approved Today</span>
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">87.4%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Stat Widget 1 */}
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-100 dark:border-zinc-900 p-3.5 sm:p-4 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold">Total Approved</span>
                    <strong className="text-xl sm:text-2xl font-black text-fg tracking-tight">S$14,250.80</strong>
                    <span className="text-[11px] text-emerald-500 font-semibold mt-1">✓ 12 claims settled successfully</span>
                  </div>

                  {/* Stat Widget 2 */}
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-100 dark:border-zinc-900 p-3.5 sm:p-4 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-bold">Audit Status</span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] sm:text-xs font-black uppercase tracking-wider">IRAS OK</span>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-3">Zero policy deviations detected</span>
                  </div>
                </div>

                {/* SVG Graph representing claims */}
                <div className="bg-zinc-50/20 dark:bg-zinc-900/5 border border-zinc-100 dark:border-zinc-900 rounded-xl p-4 flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Processed Volume (Last 7 Days)</span>
                  <div className="flex gap-4 items-end mt-2 h-14">
                    <div className="flex flex-col justify-between h-full text-[10px] text-zinc-400 dark:text-zinc-500 font-medium font-mono shrink-0">
                      <span>S$15k</span>
                      <span>S$10k</span>
                      <span>S$5k</span>
                      <span>S$0</span>
                    </div>
                    <div className="flex-1 h-full relative">
                      <svg viewBox="0 0 100 30" className="w-full h-full stroke-indigo-500 fill-indigo-500/5 stroke-[1.5] overflow-visible">
                        <path d="M 0 28 Q 15 10 30 20 T 60 8 T 90 2 Q 95 1 100 0 L 100 30 L 0 30 Z" />
                        <path d="M 0 28 Q 15 10 30 20 T 60 8 T 90 2 Q 95 1 100 0" fill="none" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>

      {/* Cinematic preloader */}
      <AnimatePresence mode="wait">
        {preloading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 1.04,
              filter: "blur(10px)",
              transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
            }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#09090b] font-sans select-none pointer-events-none"
          >
            {/* Cinematic Glowing Background Aura */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_60%)]" />
            
            <div className="flex flex-col items-center gap-6 relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.9 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex items-center gap-2 mb-2"
              >
                <ClaimFlowLogo className="h-9 w-9 text-zinc-900 dark:text-white" />
                <span className="text-sm font-bold tracking-widest text-zinc-900/90 dark:text-white/90 uppercase">ClaimFlow</span>
              </motion.div>

              {/* Dynamic Glowing Words */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-4xl sm:text-8xl font-black tracking-tighter">
                <motion.span
                  initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.15)] dark:drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                >
                  SNAP.
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.9, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-gradient-to-r from-pink-600 to-purple-605 dark:from-pink-500 dark:to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(219,39,119,0.15)] dark:drop-shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                >
                  CHECK.
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 1.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 dark:from-indigo-400 dark:via-violet-400 dark:to-sky-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(129,140,248,0.2)] dark:drop-shadow-[0_0_25px_rgba(129,140,248,0.4)]"
                >
                  SETTLE.
                </motion.span>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1.9, duration: 0.4 }}
                className="text-[10px] tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mt-4 font-mono font-bold"
              >
                Initializing ClaimFlow Ledger Portal
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Interactive Demo Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 sm:p-6"
          >
            <div className="absolute inset-0" onClick={() => setShowVideoModal(false)} />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 flex flex-col"
            >
              {/* Window Controls */}
              <div className="h-12 px-5 border-b border-zinc-900 bg-zinc-900/50 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 font-mono">app.claimflow.sg · interactive pipeline</span>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Close ✕
                </button>
              </div>
              <div className="p-5 sm:p-6 flex items-center justify-center bg-zinc-950/80">
                <Pipeline />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function SignInCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<string | null>(null);

  // Credentials State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  // Forgot Password State
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleDemoLogin = (demoEmail: string, roleName: string) => {
    setActiveRole(roleName);
    setLoading(true);
    setError("");

    let matchedUser: UserSession = {
      email: demoEmail,
      name: "Sarah Tan",
      role: "Employee",
      department: "Sales",
      avatarUrl: "/animoji_employee.jpg"
    };

    if (demoEmail === "demo.employee@claimflow.com") {
      matchedUser = {
        email: demoEmail,
        name: "Sarah Tan",
        role: "Employee",
        department: "Sales",
        avatarUrl: "/animoji_employee.jpg"
      };
    } else if (demoEmail === "demo.manager@claimflow.com") {
      matchedUser = {
        email: demoEmail,
        name: "Marcus Lim",
        role: "Approving Officer",
        department: "Operations",
        avatarUrl: "/animoji_approver.jpg"
      };
    } else if (demoEmail === "demo.finance@claimflow.com") {
      matchedUser = {
        email: demoEmail,
        name: "Dan Yeo",
        role: "Finance Admin",
        department: "Finance",
        avatarUrl: "/animoji_finance.jpg"
      };
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("claimflow_user", JSON.stringify(matchedUser));
    }

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 850);
  };

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError("");

    const lowerEmail = email.toLowerCase().trim();
    let userRole: "Employee" | "Approving Officer" | "Finance Admin" = "Employee";
    let userName = "Sarah Tan";
    let userDept = "Sales";
    let avatar = "/animoji_employee.jpg";

    if (lowerEmail === "demo.employee@claimflow.com" || lowerEmail.includes("employee")) {
      userRole = "Employee";
      userName = "Sarah Tan";
      userDept = "Sales";
      avatar = "/animoji_employee.jpg";
    } else if (lowerEmail === "demo.manager@claimflow.com" || lowerEmail.includes("manager") || lowerEmail.includes("officer")) {
      userRole = "Approving Officer";
      userName = "Marcus Lim";
      userDept = "Operations";
      avatar = "/animoji_approver.jpg";
    } else if (lowerEmail === "demo.finance@claimflow.com" || lowerEmail.includes("finance") || lowerEmail.includes("admin")) {
      userRole = "Finance Admin";
      userName = "Dan Yeo";
      userDept = "Finance";
      avatar = "/animoji_finance.jpg";
    } else {
      userName = email.split("@")[0].split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
      userRole = "Employee";
      userDept = "Sales";
      avatar = "/animoji_employee.jpg";
    }

    const sessionObj: UserSession = {
      email: lowerEmail,
      name: userName,
      role: userRole,
      department: userDept,
      avatarUrl: avatar
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("claimflow_user", JSON.stringify(sessionObj));
    }

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 850);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your email address.");
      return;
    }
    setResetLoading(true);
    setError("");
    setTimeout(() => {
      setResetLoading(false);
      setResetSuccess(true);
    }, 1000);
  };

  return (
    <div className="relative group w-full max-w-sm rounded-[2.5rem] p-0.5 bg-gradient-to-b from-white/20 via-white/5 to-white/0 dark:from-zinc-800/30 dark:via-zinc-900/10 dark:to-transparent shadow-2xl backdrop-blur-xl backdrop-saturate-150 overflow-hidden">
      {/* Decorative gradient corner glow */}
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/15 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

      <div className="relative rounded-[2.4rem] bg-white/80 dark:bg-zinc-950/80 p-6 sm:p-8 flex flex-col">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/25 flex items-center justify-center shadow-inner mb-3 border border-indigo-500/20">
            <ClaimFlowLogo className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-fg">
            {forgotMode ? "Reset Password" : "Sign In to ClaimFlow"}
          </h2>
          <p className="mt-1 text-xs text-fg-secondary max-w-[280px] font-medium leading-relaxed">
            {forgotMode 
              ? "Enter your email to receive a secure password recovery link." 
              : "Access your receipt scanning & automated reimbursement portal."}
          </p>
        </div>

        {/* FORGOT PASSWORD SCREEN */}
        {forgotMode ? (
          <div className="flex flex-col">
            {resetSuccess ? (
              <div className="flex flex-col items-center text-center p-3 py-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4">
                <Check className="h-8 w-8 text-emerald-500 mb-2 stroke-[3px]" />
                <h4 className="text-xs font-bold text-fg">Check your inbox</h4>
                <p className="text-[11px] text-fg-secondary mt-1 font-medium leading-relaxed">
                  We&apos;ve sent a password recovery link to <strong className="text-fg font-semibold">{resetEmail}</strong>.
                </p>
                <button
                  onClick={() => {
                    setForgotMode(false);
                    setResetSuccess(false);
                    setResetEmail("");
                    setError("");
                  }}
                  className="mt-4 w-full bg-fg text-canvas rounded-xl py-2 text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-3.5">
                {error && (
                  <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-semibold text-center">
                    {error}
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-fg-tertiary" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.02] text-xs focus:outline-none focus:ring-1.5 focus:ring-accent/30 focus:border-accent transition-all font-medium placeholder:text-fg-tertiary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-fg text-canvas rounded-xl py-2.5 text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-75"
                >
                  {resetLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Recovery Link"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError("");
                  }}
                  className="text-center text-xs text-fg-secondary hover:text-fg font-semibold mt-1 transition-colors hover:underline"
                >
                  Cancel and Go Back
                </button>
              </form>
            )}
          </div>
        ) : (
          /* STANDARD SIGN IN SCREEN */
          <form onSubmit={handleCredentialsLogin} className="flex flex-col">
            {error && (
              <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-semibold text-center mb-3">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* Email */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-fg-tertiary" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.02] text-xs focus:outline-none focus:ring-1.5 focus:ring-accent/30 focus:border-accent transition-all font-medium placeholder:text-fg-tertiary"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setResetEmail(email);
                      setError("");
                    }}
                    className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-fg-tertiary" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.02] text-xs focus:outline-none focus:ring-1.5 focus:ring-accent/30 focus:border-accent transition-all font-medium placeholder:text-fg-tertiary"
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 text-left py-0.5 select-none">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <label htmlFor="remember" className="text-[11px] text-fg-secondary font-semibold cursor-pointer">
                  Remember this device
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-fg text-canvas rounded-xl py-2.5 text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-75"
              >
                {loading && activeRole === null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </button>
            </div>

            {/* Sandbox Divider */}
            <div className="relative my-4 flex items-center">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-900" />
              <span className="flex-shrink mx-3 text-[9px] font-black uppercase tracking-widest text-fg-tertiary bg-white/0 dark:bg-zinc-950/0">
                Or Sandbox Sign-In
              </span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-900" />
            </div>

            {/* Stacked Quick Sandbox profiles in a dense layout */}
            <div className="flex flex-col gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const avatarImage = 
                  acc.role.includes("Approving") ? "/animoji_approver.jpg" :
                  acc.role.includes("Finance") ? "/animoji_finance.jpg" :
                  "/animoji_employee.jpg";
                const isCurrentLoading = loading && activeRole === acc.role;

                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword("sandbox_demo_pass");
                      handleDemoLogin(acc.email, acc.role);
                    }}
                    disabled={loading}
                    className="flex items-center gap-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-white/[0.01] hover:bg-white/80 dark:hover:bg-white/[0.04] px-3 py-2 text-left transition-all hover:border-indigo-500/20 group disabled:opacity-70 cursor-pointer shadow-sm relative overflow-hidden"
                  >
                    <img
                      src={avatarImage}
                      alt={acc.role}
                      className="h-7 w-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0"
                    />
                    <div className="min-w-0 flex-1 leading-tight z-10 flex items-center justify-between">
                      <div className="text-[11px] font-black text-fg">
                        {acc.role === "Approving Officer" ? "Approver" : acc.role === "Finance Admin" ? "Finance" : "Employee"}
                      </div>
                      {isCurrentLoading ? (
                        <Loader2 className="h-3 w-3 text-indigo-500 animate-spin shrink-0" />
                      ) : (
                        <span className="text-[9px] font-bold text-fg-tertiary group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-wider">
                          Demo login →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </form>
        )}
        
      </div>
    </div>
  );
}



