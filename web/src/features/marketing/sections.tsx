"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  motion,
  animate,
  useMotionValue,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  ScanLine,
  Sparkles,
  ShieldCheck,
  GitBranch,
  Banknote,
  FileSearch,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Reveal, Magnetic } from "./motion-primitives";

/* ---------------------------------------------------------------- marquee -- */

const MARQUEE = [
  "OCR receipt capture",
  "AI autofill",
  "IRAS policy engine",
  "Auto-approval",
  "GIRO / PayNow payout",
  "Immutable audit trail",
  "PDPA aligned",
  "GST-ready",
];

export function TrustMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 py-6">
      <div className="flex w-max animate-[marquee_32s_linear_infinite] gap-10 pr-10">
        {[...MARQUEE, ...MARQUEE].map((m, i) => (
          <span
            key={i}
            className="flex items-center gap-3 whitespace-nowrap text-sm font-medium text-white/35"
          >
            {m}
            <span className="h-1 w-1 rounded-full bg-white/20" />
          </span>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------- how it works (steps) */

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScanLine,
    title: "Capture",
    body: "Snap or drop a receipt. Azure Document Intelligence reads merchant, amount, GST, date and line items in under a second.",
  },
  {
    icon: Sparkles,
    title: "Autofill",
    body: "The claim form fills itself — category, fields, and GST — with a confidence trail so the employee only confirms.",
  },
  {
    icon: ShieldCheck,
    title: "Validate",
    body: "Every claim is scored against your IRAS-aligned policy rules: ceilings, disallowed categories, receipt thresholds, dates.",
  },
  {
    icon: GitBranch,
    title: "Route",
    body: "In-policy claims auto-approve; exceptions route to the right manager with the reason surfaced inline.",
  },
  {
    icon: Banknote,
    title: "Pay out",
    body: "Finance batches endorsed claims and disburses by GIRO or PayNow — reconciled and timestamped.",
  },
  {
    icon: FileSearch,
    title: "Audit",
    body: "Every action is written to an immutable trail. Export for IRAS, finance review, or a dispute in one click.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="how" className="relative mx-auto max-w-5xl px-6 py-28">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300/80">
          The flow
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Receipt in. Reimbursement out. Six moves, zero busywork.
        </h2>
      </Reveal>

      <div ref={ref} className="relative mt-16 pl-8 sm:pl-10">
        {/* track */}
        <div className="absolute left-[7px] top-2 h-full w-px bg-white/10 sm:left-[9px]" />
        {/* progress line */}
        <motion.div
          aria-hidden
          style={{ scaleY: reduce ? 1 : lineScale }}
          className="absolute left-[7px] top-2 h-full w-px origin-top bg-gradient-to-b from-indigo-400 via-violet-400 to-sky-400 sm:left-[9px]"
        />
        <div className="flex flex-col gap-12">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} i={i} className="relative">
                <span className="absolute -left-8 top-1 grid h-4 w-4 place-items-center rounded-full border border-white/20 bg-zinc-950 sm:-left-10">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </span>
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      <span className="mr-2 font-mono text-sm text-white/30">
                        0{i + 1}
                      </span>
                      {s.title}
                    </h3>
                    <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-white/55">
                      {s.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- feature grid -- */

const FEATURES = [
  { icon: ScanLine, t: "OCR receipt scanning", d: "Azure Document Intelligence with a demo fallback — always shows which engine ran." },
  { icon: Sparkles, t: "AI autofill", d: "Per-category fields populated from the receipt, never overwriting what you typed." },
  { icon: ShieldCheck, t: "Policy validation", d: "A transparent, data-driven rule engine you can read and audit." },
  { icon: GitBranch, t: "Approval workflow", d: "Auto-approve in-policy claims; route exceptions with the reason attached." },
  { icon: Banknote, t: "Finance reimbursement", d: "Batch payouts via GIRO/PayNow with GST captured for IRAS." },
  { icon: FileSearch, t: "Audit trail", d: "Immutable, exportable history of every action on every claim." },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-28">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300/80">
          Everything in the loop
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          One system from receipt to payout.
        </h2>
      </Reveal>
      <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal key={f.t} i={i % 3}>
              <FeatureCell icon={Icon} title={f.t} body={f.d} />
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function FeatureCell({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
        ref.current.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }}
      onMouseLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
      className="group h-full bg-zinc-950 p-7 transition-transform duration-200 [transform-style:preserve-3d] hover:bg-zinc-900/60"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-indigo-300 transition-colors group-hover:border-indigo-400/40 group-hover:text-indigo-200">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-base font-semibold tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-white/55">{body}</p>
    </div>
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
      <div className="grid grid-cols-1 gap-10 rounded-3xl border border-white/10 bg-white/[0.02] px-8 py-14 sm:grid-cols-3">
        {STATS.map((s, i) => (
          <Reveal key={s.label} i={i} className="text-center">
            <p className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-semibold tracking-tight text-transparent">
              <CountUp to={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-3 text-sm text-white/50">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- cta -- */

export function CTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-28">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 px-8 py-20 text-center">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_120%_at_50%_0%,rgba(99,102,241,0.25),transparent_70%)]"
        />
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Stop chasing receipts. Start settling claims.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/55">
            See the entire flow — capture to payout — on live demo data. No
            signup.
          </p>
          <div className="mt-9 flex justify-center">
            <Magnetic>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 transition-transform active:scale-95"
              >
                Launch ClaimFlow
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Magnetic>
          </div>
        </Reveal>
      </div>
      <footer className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-8 text-xs text-white/35 sm:flex-row">
        <span>© 2026 ClaimFlow · Built for Singapore SMEs</span>
        <span>PDPA + IRAS aligned</span>
      </footer>
    </section>
  );
}
