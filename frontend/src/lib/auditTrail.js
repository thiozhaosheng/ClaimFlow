// What an audit entry says, in the words the reader uses.
//
// The trail is the product's evidence, and it was being printed in the engine's
// own vocabulary: `log.action.replace(/_/g, " ").toLowerCase()` turned
// FINANCE_REIMBURSEMENT into "finance reimbursement" and MANAGER_APPROVAL into
// "manager approval", while the note beside it was often a raw rule id —
// "auto-approve-transport", or worse, "default". A finance admin reconciling a
// payment run, or a lecturer reading the one screen that proves the workflow
// happened, should not have to translate.
//
// The keys are every action the API writes (grep for `action: '` in
// backend/api/src and prisma/seed.ts). Anything unmapped falls back to the old
// de-underscored form rather than disappearing.

import policies from "../data/policies.json";

/** Human label per audit action. */
export const ACTION_LABELS = {
  POLICY_RECOMMENDED_APPROVAL: "Recommended by policy",
  ROUTED_TO_HUMAN: "Sent for review",
  RECOMMENDATION_WITHHELD_OCR_UNAVAILABLE: "Recommendation withheld — scan failed",
  RECOMMENDATION_WITHHELD_OCR_INCOMPLETE: "Recommendation withheld — scan incomplete",
  MANAGER_APPROVAL: "Endorsed",
  MANAGER_REJECTION: "Rejected",
  CHANGES_REQUESTED: "Correction requested",
  CORRECTION_SUBMITTED: "Correction submitted",
  FINANCE_REIMBURSEMENT: "Paid",
  WITHDRAWN_BY_SUBMITTER: "Withdrawn",
  COMMENT: "Comment",
};

/**
 * The groups the finance filter offers.
 *
 * The segmented control filtered on the *rendered* string — `log.action !==
 * "Claim submitted"` — and no action has ever produced that text, nor
 * "Endorsed" or "Marked as paid". All three buttons returned an empty table;
 * only "All" worked. Grouping by the raw action is the thing that cannot drift
 * out of sync with what the backend writes.
 *
 * "Submitted" is every entry written at submission time: the engine's verdict
 * is what the API logs when a claim arrives, so those entries are the record of
 * the claim being made.
 */
export const ACTION_GROUPS = {
  Submitted: [
    "POLICY_RECOMMENDED_APPROVAL",
    "ROUTED_TO_HUMAN",
    "RECOMMENDATION_WITHHELD_OCR_UNAVAILABLE",
    "RECOMMENDATION_WITHHELD_OCR_INCOMPLETE",
  ],
  Corrections: ["CHANGES_REQUESTED", "CORRECTION_SUBMITTED"],
  Endorsed: ["MANAGER_APPROVAL"],
  Paid: ["FINANCE_REIMBURSEMENT"],
  Rejected: ["MANAGER_REJECTION"],
};

export function actionLabel(action) {
  if (!action) return "";
  return ACTION_LABELS[action] || action.replace(/_/g, " ").toLowerCase();
}

/** Does this raw action belong to the named filter group? */
export function actionInGroup(action, group) {
  if (!group || group === "All") return true;
  const members = ACTION_GROUPS[group];
  return Array.isArray(members) && members.includes(action);
}

const RULE_LABELS = new Map(policies.rules.map((r) => [r.id, r.label]));

// Two remark values that look like rule ids but are not in policies.json —
// they are written by the seed and by createClaim's routing branch.
const PSEUDO_RULES = {
  default: "No rule matched",
  "ocr-unavailable-manual-review": "The receipt could not be read",
};

const looksLikeRuleId = (s) => /^[a-z][a-z0-9-]*$/.test(s);

/**
 * The note on an audit row, with any rule id swapped for the rule's written
 * name. Remarks come in three shapes: a bare rule id ("route-large-amount"),
 * a rule id with a parenthetical ("auto-approve-small-meal (recommendation
 * withheld: OCR could not read Date)"), or a sentence someone typed. Only the
 * first two are translated; a sentence is returned untouched.
 */
export function remarkText(remarks) {
  const raw = typeof remarks === "string" ? remarks.trim() : "";
  if (!raw) return "";

  const head = raw.split(" (")[0];
  const tail = raw.slice(head.length);
  const named = RULE_LABELS.get(head) || PSEUDO_RULES[head];
  if (named) return `${named}${tail}`;

  // An unknown id-shaped token is still the engine talking to itself; showing
  // nothing beats showing a slug the reader cannot act on.
  if (looksLikeRuleId(head) && head.includes("-") && !tail) return "";
  return raw;
}
