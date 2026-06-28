"use client";

import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import {
  Receipt,
  ScanLine,
  FileText,
  ShieldCheck,
  GitBranch,
  CheckCircle2,
  Check,
} from "lucide-react";

const STEPS = [
  { key: "upload", label: "Receipt uploaded", icon: Receipt },
  { key: "ocr", label: "OCR extracting", icon: ScanLine },
  { key: "autofill", label: "Autofill fields", icon: FileText },
  { key: "policy", label: "Policy validated", icon: ShieldCheck },
  { key: "approval", label: "Approval routed", icon: GitBranch },
  { key: "payout", label: "Payout completed", icon: CheckCircle2 },
] as const;

const FIELDS = [
  { k: "Merchant", v: "Jumbo Seafood" },
  { k: "Amount", v: "S$318.40" },
  { k: "GST (9%)", v: "S$26.29" },
  { k: "Date", v: "18 Jun 2026" },
];

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

export function Pipeline() {
  const reduce = useReducedMotion();
  const [autoStep, setAutoStep] = useState(0);
  // Under reduced motion, hold on the final (payout) frame; otherwise loop.
  const step = reduce ? STEPS.length - 1 : autoStep;

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(
      () => setAutoStep((s) => (s + 1) % STEPS.length),
      2300,
    );
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div className="relative w-full max-w-md">
      {/* glow */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(129,140,248,0.28),transparent_70%)] blur-2xl"
      />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-2 font-mono text-[11px] text-white/40">
            claimflow · CLM-1042
          </span>
        </div>

        {/* stage */}
        <div className="relative h-64 p-5">
          <AnimatePresence mode="wait">
            <motion.div key={STEPS[step].key} {...fade} className="h-full">
              {step === 0 && <SceneUpload />}
              {step === 1 && <SceneOcr />}
              {step === 2 && <SceneAutofill />}
              {step === 3 && <ScenePolicy />}
              {step === 4 && <SceneApproval />}
              {step === 5 && <ScenePayout />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* stepper rail */}
        <div className="grid grid-cols-6 gap-1.5 border-t border-white/10 px-4 py-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.key} className="flex flex-col items-center gap-1.5">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg border transition-colors ${
                    active
                      ? "border-indigo-400/60 bg-indigo-400/15 text-indigo-300"
                      : done
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.02] text-white/30"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="h-0.5 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.span
                    className="block h-full bg-indigo-400/70"
                    initial={false}
                    animate={{ width: active ? "100%" : done ? "100%" : "0%" }}
                    transition={{ duration: active ? 2.1 : 0.3, ease: "linear" }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* current step caption */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70">
        <AnimatePresence mode="wait">
          <motion.span
            key={STEPS[step].key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="font-medium"
          >
            {STEPS[step].label}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between text-sm">{children}</div>;
}

function SceneUpload() {
  return (
    <div className="grid h-full place-items-center">
      <motion.div
        initial={{ y: -24, opacity: 0, rotate: -4 }}
        animate={{ y: 0, opacity: 1, rotate: -2 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="relative flex h-36 w-28 flex-col gap-2 rounded-xl border border-white/15 bg-white/[0.06] p-3"
      >
        <Receipt className="h-5 w-5 text-white/50" />
        <span className="h-1.5 w-3/4 rounded bg-white/15" />
        <span className="h-1.5 w-1/2 rounded bg-white/10" />
        <span className="mt-auto h-2 w-2/3 rounded bg-white/20" />
      </motion.div>
    </div>
  );
}

function SceneOcr() {
  return (
    <div className="relative grid h-full place-items-center overflow-hidden">
      <div className="relative h-36 w-28 rounded-xl border border-indigo-400/30 bg-white/[0.04] p-3">
        <span className="h-1.5 w-3/4 rounded bg-white/15" />
        <span className="mt-2 block h-1.5 w-1/2 rounded bg-white/10" />
        <motion.span
          className="absolute inset-x-0 h-8 bg-[linear-gradient(to_bottom,transparent,rgba(129,140,248,0.35),transparent)]"
          initial={{ top: 0 }}
          animate={{ top: ["0%", "85%", "0%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <span className="mt-3 font-mono text-[11px] text-indigo-300/80">
        reading fields…
      </span>
    </div>
  );
}

function SceneAutofill() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      {FIELDS.map((f, i) => (
        <motion.div
          key={f.k}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.18, duration: 0.35 }}
        >
          <Row>
            <span className="text-white/40">{f.k}</span>
            <span className="font-medium text-white/90 tabular-nums">{f.v}</span>
          </Row>
          <span className="mt-1 block h-px w-full bg-white/8" />
        </motion.div>
      ))}
    </div>
  );
}

function ScenePolicy() {
  const checks = ["Receipt attached", "Within S$500 ceiling", "GST captured"];
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {checks.map((c, i) => (
        <motion.div
          key={c}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.25 }}
          className="flex items-center gap-2.5 text-sm text-white/80"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.25 + 0.1, type: "spring", stiffness: 300 }}
            className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"
          >
            <Check className="h-3 w-3" />
          </motion.span>
          {c}
        </motion.div>
      ))}
    </div>
  );
}

function SceneApproval() {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex items-center gap-3">
        {["Employee", "Manager", "Finance"].map((n, i) => (
          <motion.div key={n} className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.4 }}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border border-indigo-400/40 bg-indigo-400/10 text-[11px] font-semibold text-indigo-200">
                {n[0]}
              </span>
              <span className="text-[10px] text-white/50">{n}</span>
            </motion.div>
            {i < 2 && (
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 28, opacity: 1 }}
                transition={{ delay: i * 0.4 + 0.2 }}
                className="h-px bg-indigo-400/50"
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ScenePayout() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"
        >
          <CheckCircle2 className="h-7 w-7" />
        </motion.span>
        <p className="mt-3 text-lg font-semibold tracking-tight text-white">
          S$318.40 reimbursed
        </p>
        <p className="text-xs text-white/50">PayNow · settled in 14 minutes</p>
      </div>
    </div>
  );
}
