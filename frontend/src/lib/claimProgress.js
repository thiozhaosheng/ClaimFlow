// Pure derivation of a claim's process timeline and its document/requirement
// checklist. Kept side-effect-free so the detail view can render meaningful,
// status-driven state (and so it can be unit-tested). Color is assigned by
// MEANING here (done / current / blocked / missing), never decoration.

const RECEIPT_REQUIRED_OVER = 50;
const FULL_TAX_INVOICE_OVER = 1000;
const MAX_AGE_DAYS = 90;

const DISALLOWED_CATEGORIES = [
  "Medical (non-statutory)",
  "Club Subscription",
  "Family Benefit",
  "Motor Car (non-commercial)",
];

/**
 * Build the linear process timeline for a claim.
 * Each stage: { key, label, state: "done"|"current"|"upcoming"|"rejected" }.
 * @param {{status?: string}} claim
 * @returns {Array<{key:string,label:string,state:string}>}
 */
export function deriveStages(claim) {
  const status = claim?.status || "Pending";

  if (status === "Rejected") {
    return [
      { key: "submitted", label: "Submitted", state: "done" },
      { key: "manager", label: "Manager approval", state: "rejected" },
      { key: "hr", label: "HR verification", state: "upcoming" },
      { key: "payout", label: "GIRO / PayNow payout", state: "upcoming" },
    ];
  }

  // Singapore SME reimbursement flow:
  //   Submitted → Manager approval → HR verification → GIRO/PayNow payout
  // `rank` is the index of the stage currently in progress, so earlier stages
  // read as done. Pending → awaiting manager (1); Endorsed → manager done, HR
  // verifying (2); Paid → all done (4, past the last index).
  const rank = { Pending: 1, Endorsed: 2, Paid: 4 }[status] ?? 1;
  const stage = (key, label, index) => ({
    key,
    label,
    state: index < rank ? "done" : index === rank ? "current" : "upcoming",
  });

  return [
    stage("submitted", "Submitted", 0),
    stage("manager", "Manager approval", 1),
    stage("hr", "HR verification", 2),
    stage("payout", "GIRO / PayNow payout", 3),
  ];
}

function daysSince(dateStr, now = new Date()) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((now - d) / 86_400_000);
}

/**
 * Build the requirements checklist for a claim.
 * Each item: { key, label, state, detail?, canUpload? }
 *   state ∈ "done" | "missing" | "blocked" | "optional" | "review"
 * @param {object} claim
 * @param {Date} [now]
 */
export function deriveRequirements(claim, now = new Date()) {
  if (!claim) return [];
  const amount = Number(claim.amount) || 0;
  const hasReceipt = Boolean(claim.receiptUrl);
  const items = [];

  // Receipt
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
      detail: hasReceipt
        ? "Attached."
        : "Optional under S$50 — recommended.",
      canUpload: !hasReceipt,
    });
  }

  // Full tax invoice for large claims
  if (amount > FULL_TAX_INVOICE_OVER) {
    items.push({
      key: "tax-invoice",
      label: "Full tax invoice",
      state: "review",
      detail: "Above S$1,000 — finance verifies GST reg. no. & serial.",
    });
  }

  // GST captured
  items.push({
    key: "gst",
    label: "GST captured",
    state: claim.gstAmount != null ? "done" : "optional",
    detail:
      claim.gstAmount != null
        ? "GST recorded for IRAS reporting."
        : "No GST recorded (may be GST-exempt).",
  });

  // Within claim window
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

  // Category eligibility
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

/**
 * Roll the requirements up into a single headline state for the claim.
 * @param {Array<{state:string}>} requirements
 * @returns {"blocked"|"missing"|"review"|"complete"}
 */
export function requirementsSummary(requirements) {
  if (requirements.some((r) => r.state === "blocked")) return "blocked";
  if (requirements.some((r) => r.state === "missing")) return "missing";
  if (requirements.some((r) => r.state === "review")) return "review";
  return "complete";
}

export const PROGRESS_CONSTANTS = {
  RECEIPT_REQUIRED_OVER,
  FULL_TAX_INVOICE_OVER,
  MAX_AGE_DAYS,
};
