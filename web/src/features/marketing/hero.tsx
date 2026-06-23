"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useReducedMotion,
} from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ParticleField } from "./particle-field";
import { Pipeline } from "./pipeline";
import { Magnetic } from "./motion-primitives";

export function Hero() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(50);
  const my = useMotionValue(30);
  const glow = useMotionTemplate`radial-gradient(40rem 40rem at ${mx}% ${my}%, rgba(99,102,241,0.16), transparent 60%)`;

  return (
    <section
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
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />

      <div className="mx-auto grid min-h-[92vh] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-28 lg:grid-cols-2">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            AI claims, settled at the speed of trust
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[4.25rem]"
          >
            Snap a receipt.
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
              Get reimbursed.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-6 max-w-md text-lg leading-relaxed text-white/60"
          >
            ClaimFlow reads the receipt, fills the claim, checks it against IRAS
            policy, routes the approval, and pays out by GIRO/PayNow — while you
            do nothing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition-transform active:scale-95"
              >
                Launch the demo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/80 backdrop-blur transition-colors hover:bg-white/[0.07]"
              >
                See how it works
              </Link>
            </Magnetic>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8 text-xs font-medium uppercase tracking-widest text-white/35"
          >
            PDPA + IRAS aligned · Built for Singapore SMEs
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center lg:justify-end"
          style={{ perspective: 1200 }}
        >
          <Pipeline />
        </motion.div>
      </div>
    </section>
  );
}
