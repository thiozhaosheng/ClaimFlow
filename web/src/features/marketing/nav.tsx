"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Magnetic } from "./motion-primitives";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { ClaimFlowLogo } from "./logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#proof", label: "Why ClaimFlow" },
];

export function Nav() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  const isDark = resolvedTheme === "dark";
  const nextIsDark = !isDark;

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-4"
    >
      <div className="mx-auto mt-4 flex max-w-5xl items-center justify-between gap-4 rounded-full border border-white/20 dark:border-white/10 bg-white/[0.08] dark:bg-black/[0.15] px-6 py-2 backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all duration-300">
        <Link href="/" className="flex items-center gap-2.5">
          <ClaimFlowLogo className="h-7 w-7" />
          <span className="text-sm font-bold tracking-tight text-fg transition-colors">
            ClaimFlow
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-fg-secondary transition-all hover:bg-fg/5 dark:hover:bg-white/10 hover:text-fg active:scale-95"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {mounted ? (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
              className="relative grid h-8 w-8 place-items-center rounded-full border border-black/[0.08] dark:border-white/15 text-fg-secondary hover:text-fg overflow-hidden shadow-sm active:scale-95 transition-transform duration-200 cursor-pointer bg-white/40 dark:bg-white/5"
            >
              {/* Animated Preview Background Fill */}
              <motion.div
                className="absolute inset-0 -z-10"
                initial={false}
                animate={{
                  background: isHovered
                    ? nextIsDark 
                      ? "rgb(24, 24, 27)" // dark zinc-900
                      : "rgb(255, 255, 255)" // bright white
                    : isDark
                      ? "rgba(255, 255, 255, 0.04)"
                      : "rgba(255, 255, 255, 0.2)"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />

              {/* Floating Rotating Icons */}
              <div className="relative h-3.5 w-3.5 flex items-center justify-center pointer-events-none">
                {/* Moon Icon */}
                <motion.div
                  className="absolute inset-0"
                  initial={false}
                  animate={{
                    opacity: isDark
                      ? isHovered ? 1 : 0
                      : isHovered ? 0 : 1,
                    scale: isDark
                      ? isHovered ? 1 : 0.5
                      : isHovered ? 0.5 : 1,
                    rotate: isDark
                      ? isHovered ? 0 : -90
                      : isHovered ? 90 : 0
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                >
                  <Moon className="h-full w-full" style={{ color: isHovered && !nextIsDark ? "rgb(24, 24, 27)" : undefined }} />
                </motion.div>

                {/* Sun Icon */}
                <motion.div
                  className="absolute inset-0"
                  initial={false}
                  animate={{
                    opacity: isDark
                      ? isHovered ? 0 : 1
                      : isHovered ? 1 : 0,
                    scale: isDark
                      ? isHovered ? 0.5 : 1
                      : isHovered ? 1 : 0.5,
                    rotate: isDark
                      ? isHovered ? 90 : 0
                      : isHovered ? 0 : -90
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                >
                  <Sun className="h-full w-full" style={{ color: isHovered && nextIsDark ? "rgb(250, 250, 250)" : undefined }} />
                </motion.div>
              </div>
            </button>
          ) : (
            <div className="h-8 w-8 rounded-full border border-black/[0.08] dark:border-white/15 bg-white/40 dark:bg-white/5 animate-pulse" />
          )}
          <Magnetic strength={0.3}>
            <Link
              href="/login"
              className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-canvas hover:opacity-90 transition-all active:scale-95 duration-200"
            >
              Sign In
            </Link>
          </Magnetic>
        </div>
      </div>
    </motion.header>
  );
}
