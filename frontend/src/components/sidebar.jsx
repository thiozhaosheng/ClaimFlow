import { NavLink } from "react-router-dom";
import {
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  Shield,
  ShieldCheck,
  Sun,
  BookOpen,
  Lock,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useTheme } from "../hooks/usetheme.js";
import Logo from "./logo.jsx";
import { cn } from "../lib/utils.js";

const ROLE_LABELS = {
  employee: "Employee",
  approving: "Approving Officer",
  finance: "Finance Admin",
};

const NAV_BY_ROLE = {
  employee: [
    { to: "/employee", label: "Submit & Track", icon: FileText },
  ],
  approving: [
    { to: "/approving", label: "Approval Queue", icon: Inbox },
  ],
  finance: [
    { to: "/finance", label: "Workspace", icon: LayoutDashboard },
  ],
};

const RESOURCE_LINKS = [
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/policies", label: "Approval rules", icon: BookOpen },
  { to: "/privacy", label: "Privacy notice", icon: Lock },
];

function deriveName(email) {
  if (!email) return "";
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function Sidebar({ onNavigate, className }) {
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  if (!session) return null;

  const name = deriveName(session.email);
  const initials = (name.match(/\b\w/g) || ["U"])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = ROLE_LABELS[session.role] || "Member";
  const nav = NAV_BY_ROLE[session.role] || [];

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col bg-card text-foreground",
        className,
      )}
    >
      {/* brand */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-border-subtle">
        <Logo size={28} />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            ClaimFlow
          </span>
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">
            Singapore SME Portal
          </span>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 px-3 pt-3 overflow-y-auto">
        <p className="px-2 mb-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-tertiary">
          Workspace
        </p>
        <ul className="flex flex-col gap-0.5 mb-4">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-ds-md text-sm font-medium transition-colors no-underline",
                    isActive
                      ? "bg-accent-subtle text-accent"
                      : "text-text-secondary hover:bg-subtle hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="px-2 mb-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-tertiary">
          Resources
        </p>
        <ul className="flex flex-col gap-0.5 mb-4">
          {RESOURCE_LINKS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-ds-md text-sm font-medium transition-colors no-underline text-text-secondary hover:bg-subtle hover:text-foreground group"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="rounded-ds-md border border-border-subtle bg-subtle/40 p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              Compliance posture
            </span>
          </div>
          <p className="text-[11px] text-text-tertiary leading-snug">
            Built around <strong className="text-text-secondary">PDPA</strong> and
            <strong className="text-text-secondary"> IRAS GST</strong> requirements.
            Receipts retained 5 years per IRAS.
          </p>
        </div>
      </nav>

      {/* user card */}
      <div className="mx-3 mb-3 rounded-ds-md border border-border-subtle bg-subtle/50 p-2.5">
        <div className="flex items-center gap-2.5">
          <div className="user-identity-avatar h-9 w-9 text-xs">
            {initials}
            <span className="user-identity-presence" aria-hidden="true"></span>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-[11px] text-text-tertiary">{roleLabel}</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="flex h-7 flex-1 items-center justify-center gap-1 rounded-ds-sm border border-border-subtle bg-card text-xs font-medium text-text-secondary transition-colors hover:bg-subtle hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-7 flex-1 items-center justify-center gap-1 rounded-ds-sm border border-border-subtle bg-card text-xs font-medium text-text-secondary transition-colors hover:bg-subtle hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
