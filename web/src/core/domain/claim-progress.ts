/**
 * Derives a claim's process timeline + requirements checklist.
 * Pure; color/labels assigned by MEANING (done/current/missing/blocked).
 */
import { daysSince } from "@/core/domain/dates";
import type { Claim, ClaimStatus } from "@/core/domain/types";

export const RECEIPT_REQUIRED_OVER = 50;
export const FULL_TAX_INVOICE_OVER = 1000;
export const MAX_AGE_DAYS = 90;

const DISALLOWED_CATEGORIES = [
  "Medical (non-statutory)",
  "Club Subscription",
  "Family Benefit",
  "Motor Car (non-commercial)",
];

export type StageState = "done" | "current" | "upcoming" | "rejected";

export interface Stage {
  key: string;
  label: string;
  state: StageState;
}

/**
 * Singapore SME reimbursement flow:
 * Submitted → Manager approval → HR verification → GIRO/PayNow payout.
 */
export function deriveStages(claim: Pick<Claim, "status">): Stage[] {
  const status: ClaimStatus = claim?.status ?? "Pending";

  if (status === "Rejected") {
    return [
      { key: "submitted", label: "Submitted", state: "done" },
      { key: "manager", label: "Manager approval", state: "rejected" },
      { key: "hr", label: "HR verification", state: "upcoming" },
      { key: "payout", label: "GIRO / PayNow payout", state: "upcoming" },
    ];
  }

  const rank: Record<ClaimStatus, number> = {
    Pending: 1,
    Endorsed: 2,
    Paid: 4,
    Rejected: 1,
  };
  const r = rank[status] ?? 1;
  const at = (key: string, label: string, index: number): Stage => ({
    key,
    label,
    state: index < r ? "done" : index === r ? "current" : "upcoming",
  });

  return [
    at("submitted", "Submitted", 0),
    at("manager", "Manager approval", 1),
    at("hr", "HR verification", 2),
    at("payout", "GIRO / PayNow payout", 3),
  ];
}

export type RequirementState =
  | "done"
  | "missing"
  | "blocked"
  | "review"
  | "optional";

export interface Requirement {
  key: string;
  label: string;
  state: RequirementState;
  detail: string;
  canUpload?: boolean;
}

export function deriveRequirements(
  claim: Claim,
  now: Date = new Date(),
): Requirement[] {
  const amount = Number(claim.amount) || 0;
  const hasReceipt = Boolean(claim.receiptUrl);
  const items: Requirement[] = [];

  if (amount > RECEIPT_REQUIRED_OVER) {
    items.push({
      key: "receipt",
      label: "Receipt attached",
      state: hasReceipt ? "done" : "missing",
      detail: hasReceipt
        ? "Required above S$50 — attached."
        : "Required for claims above S$50.",
      canUpload: !hasReceipt,
    });
  } else {
    items.push({
      key: "receipt",
      label: "Receipt",
      state: hasReceipt ? "done" : "optional",
      detail: hasReceipt ? "Attached." : "Optional under S$50 — recommended.",
      canUpload: !hasReceipt,
    });
  }

  if (amount > FULL_TAX_INVOICE_OVER) {
    items.push({
      key: "tax-invoice",
      label: "Full tax invoice",
      state: "review",
      detail: "Above S$1,000 — finance verifies GST reg. no. & serial.",
    });
  }

  items.push({
    key: "gst",
    label: "GST captured",
    state: claim.gstAmount != null ? "done" : "optional",
    detail:
      claim.gstAmount != null
        ? "GST recorded for IRAS reporting."
        : "No GST recorded (may be GST-exempt).",
  });

  const age = daysSince(claim.date, now);
  items.push({
    key: "age",
    label: `Within ${MAX_AGE_DAYS}-day window`,
    state: age == null ? "review" : age <= MAX_AGE_DAYS ? "done" : "blocked",
    detail:
      age == null
        ? "No expense date."
        : age <= MAX_AGE_DAYS
          ? `Expense was ${age} day${age === 1 ? "" : "s"} ago.`
          : `Expense is ${age} days old — past the ${MAX_AGE_DAYS}-day limit.`,
  });

  const disallowed = DISALLOWED_CATEGORIES.includes(claim.type);
  items.push({
    key: "category",
    label: "Category claimable",
    state: disallowed ? "blocked" : "done",
    detail: disallowed
      ? `"${claim.type}" is on the IRAS disallowed list.`
      : `"${claim.type}" is an allowed category.`,
  });

  return items;
}

export type RequirementsSummary = "blocked" | "missing" | "review" | "complete";

export function requirementsSummary(
  reqs: Pick<Requirement, "state">[],
): RequirementsSummary {
  if (reqs.some((r) => r.state === "blocked")) return "blocked";
  if (reqs.some((r) => r.state === "missing")) return "missing";
  if (reqs.some((r) => r.state === "review")) return "review";
  return "complete";
}
