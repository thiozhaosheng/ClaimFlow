// The hero card's three demo verdicts — and the proof they can't drift.
//
// Each scenario carries the display copy the sign-in card renders, plus the
// claim context (`claim`) and rule id (`rule`) that back it. The test beside
// this file feeds every `claim` through the real policy engine and asserts
// that `rule` is exactly what fires, so editing policies.json makes the
// homepage fail the suite instead of quietly telling a story the engine no
// longer tells. It also checks the GST figures reconcile at the shipped
// inclusive rate (×9/109).
//
// The rule count in the "Policy evaluated" step is derived, not typed, for
// the same reason.
//
// `seg` names the RECEIPT you feed in, not the verdict that comes back. When
// the tabs were labelled Approved / Review / Blocked the visitor picked the
// answer and the timeline had nothing left to reveal.
//
// "Ready to approve", not "Auto-approved": the engine ADVISES and a person
// approves. The backend never writes an approval on its own — a rule match
// becomes a recommendation in the approver's queue (his call, 2026-08-12:
// bugs may seep in, the engine must not overstep).
import policies from "../data/policies.json";

export const RULE_COUNT = policies.rules.length;

// Thresholds quoted in the step details, pulled from the rules themselves so
// the card shows the shipped numbers, not remembered ones.
function ruleAmount(id) {
  return policies.rules
    .find((r) => r.id === id)
    .when.find((c) => c.field === "amount").value;
}
const TRANSPORT_CAP = ruleAmount("auto-approve-transport");
const MEAL_NOTE_OVER = ruleAmount("route-meal-missing-attendees-context");

export const OUTCOMES = ["approved", "review", "blocked"];

export const SCENARIOS = {
  approved: {
    seg: "Grab ride",
    chip: "Transport",
    merchant: "Grab · Jurong East to Raffles Place",
    amount: "S$18.50",
    gst: "incl. GST 9% S$1.53",
    rule: "auto-approve-transport",
    claim: {
      category: "Transport",
      amount: 18.5,
      receiptUrl: "receipt.jpg",
      expenseDate: "2026-08-10",
    },
    // Step details are data fragments, not captions. "Receipt read" carries
    // no detail because what was read — merchant, amount, GST — is the card
    // header right above it; describing it again was tell, not show.
    steps: [
      { time: "14:32:06", label: "Receipt read" },
      { time: "14:32:07", label: "Policy checked", detail: `${RULE_COUNT} rules` },
      { time: "14:32:07", label: "Ready to approve", detail: `≤ S$${TRANSPORT_CAP} allowance`, tone: "ok" },
      { time: "14:32:07", label: "Audit logged" },
    ],
  },
  review: {
    seg: "Team lunch",
    // "Meal" is the app's actual category value — the chip should read
    // exactly like the claim card the product would render.
    chip: "Meal",
    merchant: "Toast Box · team lunch",
    amount: "S$86.00",
    gst: "incl. GST 9% S$7.10",
    rule: "route-meal-missing-attendees-context",
    claim: {
      category: "Meal",
      amount: 86,
      receiptUrl: "receipt.jpg",
      expenseDate: "2026-08-10",
    },
    steps: [
      { time: "12:47:31", label: "Receipt read" },
      { time: "12:47:32", label: "Policy checked", detail: `${RULE_COUNT} rules` },
      { time: "12:47:32", label: "Routed to manager", detail: `> S$${MEAL_NOTE_OVER} · no attendee note`, tone: "warn" },
      { time: "12:47:32", label: "Audit logged" },
    ],
  },
  blocked: {
    seg: "Client dinner",
    chip: "Entertainment",
    merchant: "Client dinner · no client named",
    amount: "S$240.00",
    gst: "incl. GST 9% S$19.82",
    // The justification is present so the story is specifically "no client
    // named" — with both missing, the earlier missing-justification rule
    // would fire first and the card's blocked reason would be wrong.
    rule: "block-entertainment-missing-client",
    claim: {
      category: "Client Entertainment",
      amount: 240,
      receiptUrl: "receipt.jpg",
      expenseDate: "2026-08-10",
      details: { businessJustification: "Client dinner" },
    },
    // The blocked reason is already the merchant line ("no client named"),
    // so the verdict step shows only the rule fragment, and "Nothing saved"
    // stands alone — it is the whole point.
    steps: [
      { time: "18:03:54", label: "Receipt read" },
      { time: "18:03:55", label: "Policy checked", detail: `${RULE_COUNT} rules` },
      { time: "18:03:55", label: "Blocked", detail: "no client named", tone: "stop" },
      { time: "—", label: "Nothing saved" },
    ],
  },
};
