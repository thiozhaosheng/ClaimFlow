"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  ReceiptText,
  CheckSquare,
  Wallet,
  ShieldCheck,
  BarChart3,
  LogOut,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { ClaimFlowLogo } from "@/features/marketing/logo";
import { ThemeToggle } from "./theme-toggle";
import { motion } from "motion/react";
import { useHotkeyHints } from "@/hooks/use-hotkey-hints";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/claims", label: "Claims", icon: ReceiptText },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/payouts", label: "Payouts", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/audit", label: "Audit trail", icon: ShieldCheck },
] as const;

const ROLE_ACCESS = {
  "Employee": {
    allowed: ["/dashboard", "/claims", "/reports"],
    targetRole: {
      "/approvals": "Approving Officer",
      "/payouts": "Finance Admin",
      "/audit": "Finance Admin"
    }
  },
  "Approving Officer": {
    allowed: ["/dashboard", "/claims", "/approvals", "/reports"],
    targetRole: {
      "/payouts": "Finance Admin",
      "/audit": "Finance Admin"
    }
  },
  "Finance Admin": {
    allowed: ["/dashboard", "/claims", "/payouts", "/reports", "/audit"],
    targetRole: {
      "/approvals": "Approving Officer"
    }
  }
} as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const showHints = useHotkeyHints();
  const { user, logout, switchRole } = useSession();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const defaultAvatars = {
    "Employee": "/animoji_employee.jpg",
    "Approving Officer": "/animoji_approver.jpg",
    "Finance Admin": "/animoji_finance.jpg",
  };
  const avatarSrc = user?.avatarUrl || (user?.role ? defaultAvatars[user.role] : "/animoji_employee.jpg");

  const [switchTarget, setSwitchTarget] = useState<{
    href: string;
    requiredRole: "Employee" | "Approving Officer" | "Finance Admin";
  } | null>(null);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);

  const [triggeredRoute, setTriggeredRoute] = useState<string | null>(null);
  const [triggeredRole, setTriggeredRole] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.type === "route") {
        setTriggeredRoute(detail.value);
        setTimeout(() => setTriggeredRoute(null), 450);
      } else if (detail.type === "role") {
        setTriggeredRole(detail.value);
        setTimeout(() => setTriggeredRole(null), 450);
      }
    };
    window.addEventListener("shortcut-trigger", handler);
    return () => window.removeEventListener("shortcut-trigger", handler);
  }, []);

  return (
    <aside className="glass-panel flex h-full w-60 flex-col border-r border-white/20 dark:border-white/10 shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.4),0_0_40px_rgba(0,0,0,0.01)] dark:shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.05),0_0_40px_rgba(0,0,0,0.12)]">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <ClaimFlowLogo className="h-7 w-7" />
        <span className="text-[15px] font-semibold tracking-tight">ClaimFlow</span>
      </div>

      <nav className="flex-1 px-3 py-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
          Workspace
        </p>
        <ul id="onboarding-nav-links" className="flex flex-col gap-0.5" onMouseLeave={() => setHoveredHref(null)}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            
            const isAllowed = user
              ? ROLE_ACCESS[user.role].allowed.includes(href as any)
              : true;
            
            const requiredRole = user && !isAllowed
              ? ROLE_ACCESS[user.role].targetRole[href as keyof typeof ROLE_ACCESS[typeof user.role]["targetRole"]]
              : null;

            return (
              <li key={href}>
                <Link
                  id={`onboarding-nav-${label.toLowerCase().replace(" ", "-")}`}
                  href={href}
                  onMouseEnter={() => setHoveredHref(href)}
                  onClick={(e) => {
                    if (!isAllowed && requiredRole) {
                      e.preventDefault();
                      setSwitchTarget({ href, requiredRole });
                    } else if (onNavigate) {
                      onNavigate();
                    }
                  }}
                  className={cn(
                    "relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-all duration-300 ease-out active:scale-[0.98] border border-transparent cursor-pointer group",
                    active
                      ? "bg-accent/10 dark:bg-accent/15 border-accent/20 dark:border-accent/30 text-accent font-semibold hover:scale-[1.01]"
                      : isAllowed
                      ? "text-fg-secondary hover:text-accent hover:translate-x-1 hover:scale-[1.02]"
                      : "text-fg-tertiary/65 hover:bg-white/10 dark:hover:bg-white/[0.02] hover:text-fg-secondary hover:translate-x-0.5",
                    !isAllowed && "hover:blur-[2.5px]",
                    showHints && !isAllowed && "blur-[2.5px] opacity-15 scale-[0.97] pointer-events-none saturate-50",
                    triggeredRoute === href && "animate-border-pulse"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {hoveredHref === href && (
                    <motion.div
                      layoutId="sidebar-hover-pill"
                      className="absolute inset-0 bg-accent/[0.06] dark:bg-accent/[0.1] rounded-lg -z-10 border border-accent/5 dark:border-accent/10"
                      transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {showHints && (
                    <span className={cn(
                      "text-[8px] font-mono bg-zinc-100 dark:bg-zinc-800 text-fg-secondary px-1 py-0.5 rounded border border-border/80 uppercase font-black tracking-widest shrink-0 animate-scale-in mr-1",
                      triggeredRoute === href && "animate-keycap-press"
                    )}>
                      {href === "/dashboard" ? "G-D" : href === "/claims" ? "G-C" : href === "/approvals" ? "G-A" : href === "/payouts" ? "G-P" : href === "/reports" ? "G-R" : "G-L"}
                    </span>
                  )}
                  {!isAllowed && (
                    <Lock className="h-3 w-3 text-fg-tertiary shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Compliance Cheat Sheet */}
        {user?.role === "Employee" && (
          <div className="mt-5 mx-1 bg-zinc-50 dark:bg-black/20 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-2.5 select-none text-left">
            <span className="text-[8px] font-black uppercase tracking-wider text-fg-tertiary flex items-center gap-1 border-b border-border pb-1.5 mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
              Compliance Cheat-Sheet
            </span>
            <div className="flex flex-col gap-1.5 text-[9px] text-fg-secondary font-medium leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-fg-tertiary shrink-0" />
                <span>S$50+ Receipt upload</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-fg-tertiary shrink-0" />
                <span>Attendee list for dinners</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-fg-tertiary shrink-0" />
                <span>90 days filing limit</span>
              </div>
            </div>
          </div>
        )}
      </nav>
      {/* Sandbox Demo Role Switcher inside Sidebar */}
      <div id="onboarding-role-switcher" className="border-t border-white/20 dark:border-white/10 p-3.5 select-none">
        <span className="text-[10px] font-bold uppercase tracking-widest text-fg-tertiary block mb-2.5 px-1.5 leading-none">
          Demo Sandbox Role
        </span>
        <div className="flex flex-col gap-1.5" onMouseLeave={() => setHoveredRole(null)}>
          {(["Employee", "Approving Officer", "Finance Admin"] as const).map((r) => {
            const isActive = user?.role === r;
            
            const details = {
              "Employee": { name: "Sarah Tan", label: "Employee", avatar: "/animoji_employee.jpg" },
              "Approving Officer": { name: "Marcus Lim", label: "Approver", avatar: "/animoji_approver.jpg" },
              "Finance Admin": { name: "Dan Yeo", label: "Finance Admin", avatar: "/animoji_finance.jpg" },
            }[r];

            return (
              <button
                key={r}
                onMouseEnter={() => setHoveredRole(r)}
                onClick={() => switchRole(r)}
                className={cn(
                  "relative flex items-center gap-2.5 w-full rounded-xl px-2.5 py-1.5 border text-left transition-all duration-300 ease-out active:scale-[0.98] cursor-pointer shadow-sm z-10",
                  isActive
                    ? r === "Employee"
                      ? "bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/20 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-semibold hover:scale-[1.01]"
                      : r === "Approving Officer"
                      ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold hover:scale-[1.01]"
                      : "bg-pink-500/10 dark:bg-pink-500/15 border-pink-500/20 dark:border-pink-500/30 text-pink-600 dark:text-pink-400 font-semibold hover:scale-[1.01]"
                    : r === "Employee"
                    ? "bg-transparent border-transparent text-fg-secondary hover:text-indigo-600 dark:hover:text-indigo-400 hover:translate-x-0.5 hover:scale-[1.02]"
                    : r === "Approving Officer"
                    ? "bg-transparent border-transparent text-fg-secondary hover:text-amber-600 dark:hover:text-amber-400 hover:translate-x-0.5 hover:scale-[1.02]"
                    : "bg-transparent border-transparent text-fg-secondary hover:text-pink-600 dark:hover:text-pink-400 hover:translate-x-0.5 hover:scale-[1.02]",
                  triggeredRole === r && "animate-border-pulse"
                )}
              >
                {hoveredRole === r && (
                  <motion.div
                    layoutId="sandbox-hover-pill"
                    className={cn(
                      "absolute inset-0 rounded-xl -z-10 border",
                      r === "Employee"
                        ? "bg-indigo-500/[0.05] border-indigo-500/15"
                        : r === "Approving Officer"
                        ? "bg-amber-500/[0.05] border-amber-500/15"
                        : "bg-pink-500/[0.05] border-pink-500/15"
                    )}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  />
                )}
                <img
                  src={details.avatar}
                  alt={details.name}
                  className={cn(
                    "h-7 w-7 rounded-full object-cover object-top border transition-all shrink-0",
                    isActive ? "border-accent" : "border-black/5 dark:border-white/10"
                  )}
                />
                <div className="min-w-0 leading-tight">
                  <span className="block text-xs font-semibold text-fg truncate">{details.name}</span>
                  <span className="block text-[9px] text-fg-secondary font-medium mt-0.5">{details.label}</span>
                </div>
                {showHints ? (
                  <span className={cn(
                    "ml-auto text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-fg-secondary px-1 py-0.5 rounded border border-border/80 font-black shrink-0 animate-scale-in",
                    triggeredRole === r && "animate-keycap-press"
                  )}>
                    {r === "Employee" ? "1" : r === "Approving Officer" ? "2" : "3"}
                  </span>
                ) : isActive ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shrink-0 animate-pulse" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border p-3 flex items-center justify-between gap-1">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 min-w-0 flex-1">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user?.name || "Sarah Tan"}
              className="h-8 w-8 rounded-full object-cover object-top border border-black/10 dark:border-white/15 shadow-sm"
            />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent text-xs font-semibold uppercase">
              {user?.name ? user.name.slice(0, 2) : "ST"}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-bold text-fg">{user?.name || "Sarah Tan"}</div>
            <div className="truncate text-[10px] text-fg-secondary font-medium">{user?.role || "Employee"} · {user?.department || "Sales"}</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <ThemeToggle />
          <button
            onClick={logout}
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
            title="Log Out"
            className="relative grid h-9 w-9 place-items-center rounded-xl text-fg-secondary overflow-hidden active:scale-95 transition-transform duration-200 cursor-pointer shrink-0 border border-white/20 dark:border-white/10 shadow-sm"
          >
            {/* High contrast dark filled background on hover */}
            <motion.div
              className="absolute inset-0 -z-10"
              initial={false}
              animate={{
                background: isLogoutHovered
                  ? "rgb(24, 24, 27)" // high-contrast dark graphite
                  : "rgba(255, 255, 255, 0)" // transparent default
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
            {/* Animated 3D door swing on Y-axis and sliding exit arrow */}
            <motion.div
              animate={{
                rotateY: isLogoutHovered ? -35 : 0,
                x: isLogoutHovered ? 2.5 : 0,
              }}
              style={{
                transformOrigin: "left center",
                perspective: 100
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "flex items-center justify-center transition-colors duration-200",
                isLogoutHovered ? "text-red-500" : "text-fg-secondary"
              )}
            >
              <LogOut className="h-4 w-4" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Switch Role Interceptor Dialog */}
      <Dialog.Root open={switchTarget !== null} onOpenChange={(open) => !open && setSwitchTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 dark:bg-black/45 backdrop-blur-sm transition-all duration-300" />
          <Dialog.Content className="fixed inset-0 z-50 m-auto flex h-fit max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 p-6 backdrop-blur-xl saturate-180 shadow-2xl focus:outline-none transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="h-11 w-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3.5 border border-amber-500/20">
                <ShieldAlert className="h-5.5 w-5.5" />
              </div>
              <Dialog.Title className="text-base font-bold text-fg">
                Access Restricted
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-xs text-fg-secondary leading-relaxed">
                The <strong className="text-fg font-semibold">
                  {switchTarget ? NAV.find(n => n.href === switchTarget.href)?.label : "Requested"}
                </strong> section is restricted to the <strong className="text-fg font-semibold">{switchTarget?.requiredRole}</strong> role. Would you like to switch demo roles to open it?
              </Dialog.Description>
            </div>

            <div className="flex flex-col gap-2 mt-5">
              <Button
                size="sm"
                className="bg-accent text-accent-fg hover:bg-accent-hover font-bold w-full cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
                onClick={() => {
                  if (switchTarget) {
                    switchRole(switchTarget.requiredRole);
                    const dest = switchTarget.href;
                    setSwitchTarget(null);
                    router.push(dest);
                  }
                }}
              >
                Switch &amp; Open Section
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full cursor-pointer"
                onClick={() => setSwitchTarget(null)}
              >
                Cancel
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </aside>
  );
}
