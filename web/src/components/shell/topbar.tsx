"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Search, Menu, Keyboard, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Sidebar } from "./sidebar";
import { useHotkeyHints } from "@/hooks/use-hotkey-hints";
import { cn } from "@/lib/cn";

export function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutsGuideOpen, setShortcutsGuideOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const showHints = useHotkeyHints();

  const [isNewClaimTriggered, setIsNewClaimTriggered] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      setTimeout(() => setIsMac(mac), 0);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.type === "new-claim") {
        setIsNewClaimTriggered(true);
        setTimeout(() => setIsNewClaimTriggered(false), 450);
      }
    };
    window.addEventListener("shortcut-trigger", handler);
    return () => window.removeEventListener("shortcut-trigger", handler);
  }, []);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-white/20 dark:border-white/10 bg-white/[0.06] dark:bg-black/[0.1] px-4 backdrop-blur-3xl saturate-210 sm:px-6 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]">
      {/* Mobile Hamburger Navigation Menu & Brand */}
      <div className="flex items-center gap-2.5 lg:hidden shrink-0">
        <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/[0.04] text-fg-secondary hover:bg-white/40 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 dark:bg-black/45 backdrop-blur-sm transition-all duration-300" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-60 h-full flex-col bg-card shadow-2xl focus:outline-none transition-all duration-300 animate-in slide-in-from-left">
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-fg">ClaimFlow</span>
        </div>
      </div>

      <div 
        id="onboarding-command-search"
        onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
        className="relative hidden flex-1 max-w-sm items-center sm:flex cursor-pointer select-none"
      >
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-fg-tertiary" />
        <div className={cn("h-9 w-full rounded-xl border pl-9 pr-3 flex items-center justify-between text-xs text-fg-tertiary backdrop-blur-md shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)] hover:border-accent/40 transition-all duration-200", showHints ? "border-accent ring-2 ring-accent/20 bg-accent/5 scale-[1.01]" : "border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/[0.04]")}>
          <span>Search or run command...</span>
          <span className={cn("font-mono text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border text-fg-secondary transition-all", showHints ? "bg-accent border-accent text-accent-fg animate-pulse" : "bg-white/40 dark:bg-black/40 border-border/40")}>
            {isMac ? "⌘K" : "Ctrl+K"}
          </span>
        </div>
      </div>
      <div className="flex-1" />
      <Button
        id="onboarding-new-claim"
        size="sm"
        className={cn(
          "hidden sm:inline-flex shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer font-bold gap-2 items-center relative overflow-hidden",
          showHints && "ring-2 ring-accent bg-accent text-accent-fg scale-[1.02]",
          isNewClaimTriggered && "animate-border-pulse"
        )}
        onClick={() => window.dispatchEvent(new CustomEvent("open-new-claim-dialog"))}
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span>New claim</span>
        <kbd className={cn(
          "font-mono text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border select-none leading-none transition-all",
          showHints ? "bg-white text-accent border-white animate-pulse" : "bg-white/20 dark:bg-black/25 border-white/25 dark:border-white/10 text-accent-fg dark:text-fg-secondary",
          isNewClaimTriggered && "animate-keycap-press"
        )}>
          N
        </kbd>
      </Button>

      {/* Shortcuts Guide Button */}
      <Dialog.Root open={shortcutsGuideOpen} onOpenChange={setShortcutsGuideOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            aria-label="Keyboard Shortcuts"
            className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/[0.04] text-fg-secondary hover:bg-white/40 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] cursor-pointer"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 dark:bg-black/45 backdrop-blur-sm transition-all duration-300" />
          <Dialog.Content className="fixed inset-0 z-50 m-auto flex h-fit max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 p-6 backdrop-blur-3xl saturate-200 shadow-2xl focus:outline-none transition-all duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <Dialog.Title className="text-sm font-black tracking-tight text-fg flex items-center gap-2">
                <Keyboard className="h-4.5 w-4.5 text-accent animate-pulse" />
                Shortcuts Guide
              </Dialog.Title>
              <Dialog.Close className="grid h-8 w-8 place-items-center rounded-xl text-fg-secondary hover:bg-surface transition-colors cursor-pointer border border-transparent">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="flex flex-col gap-4 py-4 text-xs font-semibold select-none text-left">
              <span className="text-[10px] text-fg-tertiary font-black uppercase tracking-wider">Global Operations</span>
              
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-fg-secondary font-medium">Open Command Center</span>
                  <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">{isMac ? "⌘K" : "Ctrl+K"}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-secondary font-medium">File New Claim Modal</span>
                  <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">N</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-secondary font-medium">Toggle UI Theme</span>
                  <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">T</kbd>
                </div>
              </div>

              <span className="text-[10px] text-fg-tertiary font-black uppercase tracking-wider mt-2">Navigation Combos</span>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-fg-secondary font-medium">Go to Dashboard</span>
                  <div className="flex gap-1">
                    <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">G</kbd>
                    <span className="text-fg-tertiary font-bold">+</span>
                    <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">D</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-secondary font-medium">Go to Claims Ledger</span>
                  <div className="flex gap-1">
                    <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">G</kbd>
                    <span className="text-fg-tertiary font-bold">+</span>
                    <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">C</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-secondary font-medium">Go to Reports</span>
                  <div className="flex gap-1">
                    <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">G</kbd>
                    <span className="text-fg-tertiary font-bold">+</span>
                    <kbd className="bg-surface px-2 py-0.5 rounded border font-mono text-[10px] font-bold text-fg">R</kbd>
                  </div>
                </div>
              </div>

              <span className="text-[10px] text-fg-tertiary font-black uppercase tracking-wider mt-2">Sandbox Role Swapping</span>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-fg-secondary font-medium">Switch User Perspective</span>
                  <div className="flex gap-1 text-[9px] text-fg-tertiary font-bold">
                    <kbd className="bg-surface px-1.5 py-0.5 rounded border font-mono text-fg font-black">1</kbd> Employee &middot; 
                    <kbd className="bg-surface px-1.5 py-0.5 rounded border font-mono text-fg font-black">2</kbd> Approver &middot; 
                    <kbd className="bg-surface px-1.5 py-0.5 rounded border font-mono text-fg font-black">3</kbd> Finance
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/[0.04] text-fg-secondary hover:bg-white/40 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
      </button>
      <ThemeToggle />
    </header>
  );
}

