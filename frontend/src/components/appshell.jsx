import { useEffect, useState, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { PanelLeft, Search } from "lucide-react";
import Sidebar from "./sidebar.jsx";
import NotificationBell from "./notificationbell.jsx";
import CommandPalette from "./commandpalette.jsx";
import ShortcutsHelp from "./shortcutshelp.jsx";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet.jsx";
import { useShortcuts } from "../hooks/useShortcuts.js";
import { cn } from "../lib/utils.js";

const STORAGE_KEY = "claimflow-nav-open";

export default function AppShell() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, navOpen ? "true" : "false");
  }, [navOpen]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setNavOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  useShortcuts({ openPalette, openHelp, navigate });

  return (
    // h-screen locks the whole app to the viewport so the sidebar + topbar
    // stay put and only the main scroll-area moves.
    <div className="flex h-screen overflow-hidden bg-app text-foreground">
      {/* desktop sidebar — viewport-height, no internal scroll */}
      <div
        className={cn(
          "hidden lg:flex shrink-0 flex-col border-r border-border-subtle bg-card transition-[width] duration-200 ease-out overflow-hidden",
          navOpen ? "w-60" : "w-0",
        )}
        aria-hidden={!navOpen}
      >
        <div className="w-60 h-full flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* main column — topbar fixed, content scrolls inside */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-2 border-b border-border-subtle bg-card px-4 h-11 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-ds-sm text-text-secondary hover:bg-subtle hover:text-foreground transition-colors"
            aria-label="Open navigation"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="hidden lg:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-ds-sm text-text-tertiary hover:bg-subtle hover:text-foreground transition-colors"
            aria-label={navOpen ? "Hide navigation" : "Show navigation"}
            title={navOpen ? "Hide nav (⌘\\)" : "Show nav (⌘\\)"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={openPalette}
            className="cmdk-trigger"
            aria-label="Open command palette"
            title="Command palette (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="cmdk-trigger-label">Search</span>
            <kbd className="cmdk-trigger-kbd">⌘K</kbd>
          </button>

          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenHelp={openHelp}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
