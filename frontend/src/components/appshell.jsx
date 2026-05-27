import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { PanelLeft } from "lucide-react";
import Sidebar from "./sidebar.jsx";
import NotificationBell from "./notificationbell.jsx";
import { Sheet, SheetContent } from "./ui/sheet.jsx";
import { cn } from "../lib/utils.js";

const STORAGE_KEY = "claimflow-nav-open";

export default function AppShell() {
  const [navOpen, setNavOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

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
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-ds-sm text-text-secondary hover:bg-subtle hover:text-foreground transition-colors"
            aria-label="Open navigation"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-ds-sm text-text-tertiary hover:bg-subtle hover:text-foreground transition-colors"
            aria-label={navOpen ? "Hide navigation" : "Show navigation"}
            title={navOpen ? "Hide nav (⌘\\)" : "Show nav (⌘\\)"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="flex-1" />

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
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
