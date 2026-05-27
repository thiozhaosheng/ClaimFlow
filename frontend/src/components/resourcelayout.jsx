import { Link, NavLink, Outlet } from "react-router-dom";
import { LogIn, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useTheme } from "../hooks/usetheme.js";
import { cn } from "../lib/utils.js";
import AppShell from "./appshell.jsx";
import Logo from "./logo.jsx";

const RESOURCE_LINKS = [
  { to: "/compliance", label: "Compliance" },
  { to: "/policies", label: "Approval rules" },
  { to: "/privacy", label: "Privacy notice" },
];

function PublicResourceShell() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-app text-foreground">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-card px-5 py-0">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 no-underline text-foreground">
            <Logo size={24} />
            <span className="text-sm font-semibold tracking-tight">ClaimFlow</span>
          </Link>

          <nav aria-label="Resources" className="hidden sm:flex items-center gap-1">
            {RESOURCE_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "rounded-ds-sm px-3 py-2 text-[13px] font-medium no-underline transition-colors",
                    isActive
                      ? "bg-subtle text-foreground"
                      : "text-text-secondary hover:bg-subtle hover:text-foreground",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-8 w-8 items-center justify-center rounded-ds-sm text-text-secondary hover:bg-subtle hover:text-foreground transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <Link
              to="/"
              className="inline-flex h-8 items-center gap-1.5 rounded-ds-sm bg-accent px-3 text-[13px] font-medium text-white no-underline hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function ResourceLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;

  return session ? <AppShell /> : <PublicResourceShell />;
}
