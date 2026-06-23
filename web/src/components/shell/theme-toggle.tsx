"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Theme toggle with NO render-time dependence on the resolved theme, so server
 * and client markup are identical (no hydration mismatch). Both icons are
 * always in the DOM; CSS shows the right one based on the `.dark` class that
 * next-themes sets before paint. The aria-label is static for the same reason.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="grid h-9 w-9 place-items-center rounded-xl border border-border-strong bg-card text-fg-secondary transition-colors hover:bg-surface hover:text-fg"
    >
      <Moon className="h-4 w-4 dark:hidden" />
      <Sun className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
