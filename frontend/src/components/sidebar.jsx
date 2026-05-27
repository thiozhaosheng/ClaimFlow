import { NavLink } from "react-router-dom";
import {
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  BookOpen,
  Lock,
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
  employee: [{ to: "/employee", label: "Submit & track", icon: FileText }],
  approving: [{ to: "/approving", label: "Approval queue", icon: Inbox }],
  finance: [{ to: "/finance", label: "Workspace", icon: LayoutDashboard }],
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

function SectionLabel({ children }) {
  return (
    <p className="px-2 mb-1 text-[10px] uppercase tracking-[0.08em] font-semibold text-text-tertiary">
      {children}
    </p>
  );
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
      {/* brand — height must match AppShell topbar (h-11) so the seam between
          sidebar and main area is one continuous line, not a stepped notch */}
      <div className="flex items-center gap-2.5 px-4 h-11 border-b border-border-subtle">
        <Logo size={22} />
        <span className="text-sm font-semibold tracking-tight">ClaimFlow</span>
      </div>

      {/* nav */}
      <nav className="flex-1 px-2 pt-4 overflow-hidden">
        <SectionLabel>Workspace</SectionLabel>
        <ul className="flex flex-col gap-0.5 mb-5">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-2.5 h-8 rounded-ds-sm text-sm font-medium transition-colors no-underline",
                    isActive
                      ? "bg-subtle text-foreground"
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

        <SectionLabel>Resources</SectionLabel>
        <ul className="flex flex-col gap-0.5">
          {RESOURCE_LINKS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className="flex items-center gap-2.5 px-2.5 h-8 rounded-ds-sm text-sm font-medium transition-colors no-underline text-text-secondary hover:bg-subtle hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* user card — minimal */}
      <div className="border-t border-border-subtle px-3 py-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="user-identity-avatar h-8 w-8 text-[11px]">
            {initials}
            <span className="user-identity-presence" aria-hidden="true"></span>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-medium truncate">{name}</div>
            <div className="text-[11px] text-text-tertiary truncate">
              {roleLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="flex h-7 w-7 items-center justify-center rounded-ds-sm text-text-tertiary hover:bg-subtle hover:text-foreground transition-colors"
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
            className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-ds-sm text-[12px] font-medium text-text-secondary hover:bg-subtle hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
