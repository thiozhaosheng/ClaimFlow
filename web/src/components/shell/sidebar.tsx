"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  CheckSquare,
  Wallet,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/claims", label: "Claims", icon: ReceiptText },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/payouts", label: "Payouts", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/audit", label: "Audit trail", icon: ShieldCheck },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-60 flex-col bg-card">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg text-[13px] font-bold">
          C
        </span>
        <span className="text-[15px] font-semibold tracking-tight">ClaimFlow</span>
      </div>

      <nav className="flex-1 px-3 py-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
          Workspace
        </p>
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-surface text-fg"
                      : "text-fg-secondary hover:bg-surface hover:text-fg",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent text-xs font-semibold">
            ST
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-medium">Sarah Tan</div>
            <div className="truncate text-[11px] text-fg-tertiary">Employee · Sales</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
