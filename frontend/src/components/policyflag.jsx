import { useMemo } from "react";
import { ShieldCheck, AlertTriangle, Ban } from "lucide-react";
import {
  evaluatePolicies,
  claimContextFromForm,
} from "../lib/policy.js";
import { cn } from "../lib/utils.js";

const ICON = {
  "auto-approve": ShieldCheck,
  "route-to-human": AlertTriangle,
  block: Ban,
};

const TONE = {
  "auto-approve": "text-success-text bg-success-bg border-success/20",
  "route-to-human": "text-warning-text bg-warning-bg border-warning/20",
  block: "text-danger-text bg-danger-bg border-danger/20",
};

const SHORT_LABEL = {
  "auto-approve": "In policy",
  "route-to-human": "Needs review",
  block: "Blocked",
};

/**
 * A claim that has already been settled. The flag is advice about a decision
 * still to be made, so re-running the rules against one of these says nothing
 * anyone can act on — and reads as a contradiction. "Paid" beside "Blocked" is
 * the case that gave this away: the money left the account weeks ago, and the
 * row still claimed policy would stop it. The rules can also have changed since,
 * which makes today's verdict on last quarter's claim actively misleading.
 */
const SETTLED = new Set(["Endorsed", "Paid", "Rejected", "Withdrawn"]);

/**
 * Inline flag indicator for a claim row. Two variants:
 *  - variant="dot"  : tiny coloured dot + native title tooltip (use in dense tables)
 *  - variant="chip" : small chip with icon + short label + tooltip (use in cards)
 *
 * Pass `hideAutoApproved` to suppress green flag for routine auto-approves
 * (useful in queue views where only the flagged items matter).
 */
export default function PolicyFlag({
  claim,
  variant = "chip",
  hideAutoApproved = false,
  className,
}) {
  const policy = useMemo(() => {
    if (!claim) return null;
    return evaluatePolicies(
      claimContextFromForm({
        category: claim.type,
        amount: claim.amount,
        receiptUrl: claim.receiptUrl,
        expenseDate: claim.date,
      }),
    );
  }, [claim]);

  if (!policy) return null;
  if (claim.withdrawn || SETTLED.has(claim.status)) return null;
  if (hideAutoApproved && policy.outcome === "auto-approve") return null;

  const Icon = ICON[policy.outcome];
  const tooltip = `${policy.ruleId}: ${policy.message}`;

  if (variant === "dot") {
    const dotColor =
      policy.outcome === "auto-approve"
        ? "bg-success"
        : policy.outcome === "route-to-human"
          ? "bg-warning"
          : "bg-destructive";
    return (
      <span
        className={cn(
          "inline-flex h-1.5 w-1.5 rounded-full",
          dotColor,
          className,
        )}
        title={tooltip}
        aria-label={tooltip}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        TONE[policy.outcome],
        className,
      )}
      title={tooltip}
      aria-label={tooltip}
    >
      <Icon className="h-2.5 w-2.5" />
      {SHORT_LABEL[policy.outcome]}
    </span>
  );
}
