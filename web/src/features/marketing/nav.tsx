"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Magnetic } from "./motion-primitives";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#proof", label: "Why ClaimFlow" },
];

export function Nav() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto mt-4 flex max-w-5xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[13px] font-bold text-zinc-950">
            C
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">
            ClaimFlow
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Magnetic strength={0.3}>
          <Link
            href="/dashboard"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-transform active:scale-95"
          >
            Open app
          </Link>
        </Magnetic>
      </div>
    </motion.header>
  );
}
