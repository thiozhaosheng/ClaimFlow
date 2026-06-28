"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  Terminal, 
  ArrowRight, 
  Plus, 
  Sun, 
  Moon, 
  Shield, 
  Users, 
  Compass, 
  BarChart2, 
  DollarSign, 
  LayoutDashboard,
  HelpCircle,
  FileText
} from "lucide-react";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/cn";

interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut: string[];
  action: () => void;
  icon: React.ComponentType<any>;
}

export function CommandPalette({
  openClaimModal
}: {
  openClaimModal: () => void;
}) {
  const router = useRouter();
  const { switchRole } = useSession();
  
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMac, setIsMac] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect OS for keyboard badges
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      setTimeout(() => setIsMac(mac), 0);
    }
  }, []);

  // Theme toggle helper
  const toggleTheme = () => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
    }
  };

  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-dash", title: "Go to Dashboard", category: "Navigation", shortcut: ["G", "D"], icon: LayoutDashboard, action: () => router.push("/dashboard") },
    { id: "nav-claims", title: "Go to Claims Ledger", category: "Navigation", shortcut: ["G", "C"], icon: FileText, action: () => router.push("/claims") },
    { id: "nav-reports", title: "Go to Reports & Analytics", category: "Navigation", shortcut: ["G", "R"], icon: BarChart2, action: () => router.push("/reports") },
    { id: "nav-approvals", title: "Go to Approvals Desk", category: "Navigation", shortcut: ["G", "A"], icon: Shield, action: () => router.push("/approvals") },
    { id: "nav-payouts", title: "Go to Payouts Gateway", category: "Navigation", shortcut: ["G", "P"], icon: DollarSign, action: () => router.push("/payouts") },
    { id: "nav-audit", title: "Go to Compliance Audit", category: "Navigation", shortcut: ["G", "L"], icon: Terminal, action: () => router.push("/audit") },
    
    // Actions
    { id: "act-new", title: "File New Expense Claim", category: "Actions", shortcut: ["N"], icon: Plus, action: () => { setIsOpen(false); openClaimModal(); } },
    { id: "act-theme", title: "Toggle UI Theme", category: "Actions", shortcut: ["T"], icon: Sun, action: () => toggleTheme() },
    
    // Sandbox Roles
    { id: "role-emp", title: "Switch to Employee (Sarah)", category: "Roles", shortcut: ["1"], icon: Users, action: () => switchRole("Employee") },
    { id: "role-mgr", title: "Switch to Approver (Marcus)", category: "Roles", shortcut: ["2"], icon: Shield, action: () => switchRole("Approving Officer") },
    { id: "role-fin", title: "Switch to Finance (Dan)", category: "Roles", shortcut: ["3"], icon: DollarSign, action: () => switchRole("Finance Admin") },
  ];

  // Filter commands
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Keydown listeners for shortcuts
  useEffect(() => {
    let keyBuffer = "";
    let bufferTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key shortcuts if focused on an input element
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.getAttribute("contenteditable") === "true"
      );

      // Toggle Palette: Cmd+K / Ctrl+K / Alt+K
      if ((e.metaKey || e.ctrlKey || e.altKey) && e.code === "KeyK") {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Handle single-key shortcuts when palette is closed and not in input
      if (!isOpen && !isInput) {
        // Toggle theme: T
        if (e.code === "KeyT") {
          e.preventDefault();
          toggleTheme();
          window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "theme" } }));
          return;
        }

        // New claim: N
        if (e.code === "KeyN") {
          e.preventDefault();
          openClaimModal();
          window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "new-claim" } }));
          return;
        }

        // Roles: 1, 2, 3
        if (e.code === "Digit1") {
          e.preventDefault();
          switchRole("Employee");
          window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "role", value: "Employee" } }));
          return;
        }
        if (e.code === "Digit2") {
          e.preventDefault();
          switchRole("Approving Officer");
          window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "role", value: "Approving Officer" } }));
          return;
        }
        if (e.code === "Digit3") {
          e.preventDefault();
          switchRole("Finance Admin");
          window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "role", value: "Finance Admin" } }));
          return;
        }

        // Double combos: G + [D, C, R, A, P, L]
        if (e.code === "KeyG") {
          keyBuffer = "g";
          clearTimeout(bufferTimer);
          bufferTimer = setTimeout(() => { keyBuffer = ""; }, 1000);
          return;
        }

        if (keyBuffer === "g") {
          const code = e.code;
          if (code === "KeyD") {
            e.preventDefault();
            router.push("/dashboard");
            window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "route", value: "/dashboard" } }));
          }
          if (code === "KeyC") {
            e.preventDefault();
            router.push("/claims");
            window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "route", value: "/claims" } }));
          }
          if (code === "KeyR") {
            e.preventDefault();
            router.push("/reports");
            window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "route", value: "/reports" } }));
          }
          if (code === "KeyA") {
            e.preventDefault();
            router.push("/approvals");
            window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "route", value: "/approvals" } }));
          }
          if (code === "KeyP") {
            e.preventDefault();
            router.push("/payouts");
            window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "route", value: "/payouts" } }));
          }
          if (code === "KeyL") {
            e.preventDefault();
            router.push("/audit");
            window.dispatchEvent(new CustomEvent("shortcut-trigger", { detail: { type: "route", value: "/audit" } }));
          }
          keyBuffer = "";
          return;
        }
      }

      // Palette Keyboard Navigation controls
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(bufferTimer);
    };
  }, [isOpen, filteredCommands, selectedIndex]);

  // Reset selected index when search changes
  useEffect(() => {
    setTimeout(() => setSelectedIndex(0), 0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setTimeout(() => setSearch(""), 0);
    }
  }, [isOpen]);

  // Listen for custom trigger events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-command-palette", handleOpen);
    return () => window.removeEventListener("open-command-palette", handleOpen);
  }, []);

  // Click outside to close helper
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/35 dark:bg-black/55 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Palette Container */}
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-xl rounded-2xl border border-white/20 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 shadow-2xl overflow-hidden flex flex-col backdrop-blur-3xl saturate-200"
            >
              {/* Search Bar */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <Search className="h-4.5 w-4.5 text-fg-tertiary shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a command or page name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-fg focus:outline-none placeholder-fg-tertiary font-semibold"
                />
                <span className="text-[9px] font-black uppercase tracking-wider text-fg-tertiary bg-surface px-1.5 py-0.5 rounded border border-border">
                  ESC
                </span>
              </div>

              {/* Commands List */}
              <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-0.5 select-none text-left">
                {!search && (
                  <div className="mx-1 my-1.5 p-3 rounded-xl bg-accent/5 border border-accent/15 text-[10px] text-fg-secondary font-medium select-none leading-relaxed flex flex-col gap-1 items-start">
                    <div>
                      <span className="block font-black text-fg leading-none">First time using shortcuts?</span>
                      <p className="mt-1">
                        Use <kbd className="font-mono bg-white/50 dark:bg-black/50 px-1.5 py-0.5 rounded border border-border/40 font-bold">↑↓</kbd> to navigate, or press <kbd className="font-mono bg-white/50 dark:bg-black/50 px-1.5 py-0.5 rounded border border-border/40 font-bold">G</kbd> then <kbd className="font-mono bg-white/50 dark:bg-black/50 px-1.5 py-0.5 rounded border border-border/40 font-bold">D</kbd> sequentially on your keyboard to navigate to the Dashboard immediately.
                      </p>
                    </div>
                  </div>
                )}
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd, idx) => {
                    const isSelected = selectedIndex === idx;
                    const Icon = cmd.icon;
                    return (
                      <div
                        key={cmd.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          cmd.action();
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-100",
                          isSelected
                            ? "bg-accent text-accent-fg"
                            : "text-fg hover:bg-zinc-500/5"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-accent-fg" : "text-fg-secondary")} />
                          <span className="text-xs font-bold truncate">{cmd.title}</span>
                          <span className={cn(
                            "text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none shrink-0",
                            isSelected 
                              ? "bg-white/20 border-white/20 text-white" 
                              : "bg-surface border-border text-fg-tertiary"
                          )}>
                            {cmd.category}
                          </span>
                        </div>

                        {/* Keyboard shortcut Badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          {cmd.shortcut.map((key, kIdx) => (
                            <span
                              key={kIdx}
                              className={cn(
                                "font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded border min-w-[16px] text-center leading-none",
                                isSelected
                                  ? "bg-white/20 border-white/20 text-white"
                                  : "bg-surface border-border text-fg-tertiary"
                              )}
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-fg-tertiary font-bold flex flex-col items-center gap-1">
                    <HelpCircle className="h-6 w-6 opacity-45" />
                    <span>No commands match your query.</span>
                  </div>
                )}
              </div>

              {/* Command Palette footer helper */}
              <div className="px-4 py-2 bg-zinc-500/[0.02] border-t border-border flex items-center justify-between text-[9px] font-bold text-fg-tertiary uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  Use ↑↓ to navigate &middot; Enter to execute
                </span>
                <span>
                  Shortcut: {isMac ? "⌘K" : "Ctrl+K"}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
