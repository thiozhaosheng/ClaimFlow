import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import Sidebar from "./sidebar.jsx";
import Logo from "./logo.jsx";
import { Sheet, SheetContent } from "./ui/sheet.jsx";
import { cn } from "../lib/utils.js";

const STORAGE_KEY = "claimflow-nav-open";

export default function AppShell() {
  // Desktop: hidden by default. Persist user preference across sessions.
  const [navOpen, setNavOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, navOpen ? "true" : "false");
  }, [navOpen]);

  return (
    <div className="flex min-h-screen bg-app text-foreground">
      {/* desktop sidebar — slides in/out */}
      <div
        className={cn(
          "hidden lg:flex shrink-0 flex-col border-r border-border-subtle transition-[width] duration-200 ease-out overflow-hidden",
          navOpen ? "w-64" : "w-0",
        )}
        aria-hidden={!navOpen}
      >
        <div className="w-64 h-full flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar (always present) */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border-subtle bg-card/80 px-4 py-2.5 backdrop-blur-md sm:px-6">
          {/* mobile menu */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-ds-sm border border-border-subtle bg-card text-text-secondary hover:bg-subtle"
            aria-label="Open navigation"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          {/* desktop toggle */}
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="hidden lg:flex h-8 items-center gap-1.5 rounded-ds-sm border border-border-subtle bg-card px-2.5 text-xs font-medium text-text-secondary hover:bg-subtle hover:text-foreground transition-colors"
            aria-label={navOpen ? "Hide navigation" : "Show navigation"}
            title={navOpen ? "Hide navigation (⌘\\)" : "Show navigation (⌘\\)"}
          >
            {navOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeft className="h-3.5 w-3.5" />
            )}
            <span>{navOpen ? "Hide nav" : "Show nav"}</span>
          </button>

          {/* brand (visible when sidebar is closed, hidden when open to avoid duplicate) */}
          <div
            className={cn(
              "flex items-center gap-2 transition-opacity",
              navOpen ? "lg:opacity-0 lg:pointer-events-none" : "lg:opacity-100",
            )}
          >
            <Logo size={22} />
            <span className="text-sm font-semibold tracking-tight">
              ClaimFlow
            </span>
          </div>

          <div className="w-8 lg:w-20" />
        </div>

        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* mobile sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
