"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ShieldAlert, CheckCircle, ShieldCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session-context";
import { motion, AnimatePresence } from "motion/react";
import { formatDate } from "@/core/domain/dates";

interface StoredActivity {
  id: string;
  actor: string;
  role: string;
  action: string;
  status: string;
  date: string;
  time: string;
}

export default function AuditPage() {
  const { user, switchRole } = useSession();
  const [activities, setActivities] = useState<StoredActivity[]>([]);
  const [query, setQuery] = useState("");

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(
      (act) =>
        `${act.action} ${act.actor} ${act.role} ${act.status} ${act.id}`.toLowerCase().includes(q)
    );
  }, [activities, query]);

  useEffect(() => {
    document.title = "Ledger Audit Trail | ClaimFlow";
    if (typeof window === "undefined") return;
    const fetchActivities = () => {
      const val = localStorage.getItem("claimflow_activity_list");
      if (val) {
        try {
          setActivities(JSON.parse(val));
        } catch (e) {
          // ignore
        }
      }
    };
    fetchActivities();
    
    // Listen for changes
    window.addEventListener("storage", fetchActivities);
    return () => window.removeEventListener("storage", fetchActivities);
  }, []);

  if (user?.role !== "Finance Admin") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-[2rem] border border-white/20 dark:border-white/10 bg-white/[0.08] dark:bg-black/[0.15] backdrop-blur-3xl saturate-210 shadow-[0_8px_32px_0_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.05)] p-8 text-center"
        >
          <div className="h-12 w-12 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto mb-4 border border-pink-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-fg mb-2">Restricted Access</h2>
          <p className="text-sm text-fg-secondary mb-6 leading-relaxed">
            The Audit trail page is reserved for <strong className="text-fg font-bold">Finance Admins</strong> to verify system operations and immutable compliance logs.
          </p>
          <div className="flex flex-col gap-2.5">
            <Button
              className="bg-accent text-accent-fg hover:bg-accent-hover font-bold shadow-sm w-full flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              onClick={() => switchRole("Finance Admin")}
            >
              Switch to Finance Admin (Dan)
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance & Security"
        title="Audit Trail"
        subtitle="View immutable system records and cryptographic proofs of all claim workflows."
      />

      <div className="flex flex-col gap-4">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-sm text-fg-secondary bg-card rounded-2xl border border-border">
            No audit logs found.
          </div>
        ) : (
          <div id="audit-blockchain-chain" className="overflow-hidden rounded-2xl border border-border bg-card/45 dark:bg-card/25 backdrop-blur-3xl saturate-210 shadow-card">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-4 py-3 bg-white/30 dark:bg-black/10">
              <span className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Ledger Log Verification Status: Active
              </span>
              <label className="relative flex w-full max-w-xs items-center">
                <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-fg-tertiary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter logs by actor, action..."
                  className="h-8 w-full rounded-lg border border-border bg-card pl-8.5 pr-3 text-xs placeholder:text-fg-tertiary focus:outline-none focus:border-accent"
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold uppercase tracking-widest text-fg-tertiary bg-white/10 dark:bg-black/5">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Ledger Hash</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-fg-tertiary font-bold">
                        No logs match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act) => {
                      const mockHash = `0x${Array.from({ length: 8 })
                        .map((_, i) => (act.id.charCodeAt(i % act.id.length) % 16).toString(16))
                        .join("")}...${act.id.slice(-2)}a9`;
                      
                      let roleBadgeColor = "border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400";
                      if (act.role === "Approving Officer") {
                        roleBadgeColor = "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400";
                      } else if (act.role === "Finance Admin") {
                        roleBadgeColor = "border-pink-500/20 bg-pink-500/5 text-pink-600 dark:text-pink-400";
                      }

                      return (
                        <tr key={act.id} className="hover:bg-white/10 dark:hover:bg-white/[0.01] transition-colors">
                          <td className="p-4 whitespace-nowrap text-xs text-fg-secondary">
                            {formatDate(act.date)} {act.time}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-fg">{act.actor}</span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${roleBadgeColor}`}>
                                {act.role === "Approving Officer" ? "Approver" : act.role === "Finance Admin" ? "Finance" : "Employee"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 font-medium text-fg max-w-xs truncate" title={act.action}>
                            {act.action}
                          </td>
                          <td className="p-4 whitespace-nowrap font-mono text-xs text-fg-tertiary select-all">
                            <div className="flex items-center gap-1.5 bg-surface-strong/30 dark:bg-zinc-800/40 border border-border/80 px-2 py-0.5 rounded-lg w-fit text-[11px] font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>{mockHash}</span>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
