"use client";

import { Bell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-canvas/80 px-4 backdrop-blur sm:px-6">
      <label className="relative hidden flex-1 max-w-sm items-center sm:flex">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-fg-tertiary" />
        <input
          type="search"
          placeholder="Search claims, people, merchants…"
          className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-fg placeholder:text-fg-tertiary focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        />
      </label>
      <div className="flex-1 sm:hidden" />
      <Button size="sm" className="hidden sm:inline-flex">
        <Plus className="h-4 w-4" />
        New claim
      </Button>
      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-border-strong bg-card text-fg-secondary transition-colors hover:bg-surface hover:text-fg"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
      </button>
      <ThemeToggle />
    </header>
  );
}
