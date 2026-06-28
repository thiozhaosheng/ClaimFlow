"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useHotkeyHints } from "@/hooks/use-hotkey-hints";

/**
 * Interactive Theme Toggle with next-state hover preview animations.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const showHints = useHotkeyHints();

  const [isTriggered, setIsTriggered] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.type === "theme") {
        setIsTriggered(true);
        setTimeout(() => setIsTriggered(false), 450);
      }
    };
    window.addEventListener("shortcut-trigger", handler);
    return () => window.removeEventListener("shortcut-trigger", handler);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/[0.04] text-fg-secondary animate-pulse" />
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextIsDark = !isDark;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={`relative grid h-9 w-9 place-items-center rounded-xl border border-white/20 dark:border-white/10 text-fg-secondary hover:text-fg overflow-hidden shadow-sm active:scale-95 transition-transform duration-200 cursor-pointer ${isTriggered ? "animate-border-pulse" : ""}`}
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
      <div className="relative h-4 w-4 flex items-center justify-center pointer-events-none">
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
      {showHints && (
        <span className={`absolute inset-0 bg-accent text-accent-fg flex items-center justify-center text-[11px] font-mono font-black rounded-xl animate-scale-in z-20 select-none pointer-events-none ${isTriggered ? "animate-keycap-press" : ""}`}>
          T
        </span>
      )}
    </button>
  );
}
