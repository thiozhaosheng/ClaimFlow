# Approval Policy

Specification for the company-policy layer that decides which claims auto-approve, which need a human reviewer, and which must be rejected at submission.

## Problem we are solving

Singapore SMEs typically don't have a dedicated finance team. Every submitted claim sits in `Pending` status until a Manager or Finance Admin reviews it, by which time the queue has piled up with mostly-obvious-correct claims and a few that genuinely need attention. Reimbursement gets delayed, claimants chase their managers, and the audit trail is a mess of WhatsApp threads.

The fix is a policy layer that runs at submission time and assigns one of three outcomes:

| Outcome | What happens |
|---|---|
| **auto-approve** | Claim moves to `Endorsed` immediately. Audit log records `auto-approved by policy <rule id>`. |
| **route-to-human** | Claim stays `Pending`. The approver sees the matching policy hint inline so they know why it landed in their queue. |
| **block** | Claim is rejected at submission. The frontend shows the reason inline; nothing is persisted. |

Same configuration drives the IRAS input-tax-eligibility hint ([gst-iras.md](./gst-iras.md) §Input tax claim eligibility), so eligibility and approval share one source of truth.

## Policy rules — the starter set

Each rule is `{ id, label, when, then, message }`. `when` is a list of conditions ANDed together. `then` is one of `auto-approve` / `route-to-human` / `block`. The first matching rule wins; if nothing matches, the default is `route-to-human`.

```json
{
  "version": "2026-05-27.b",
  "currency": "SGD",
  "rules": [
    {
      "id": "block-disallowed-category",
      "label": "Disallowed category",
      "when": [
        {
          "field": "category",
          "op": "in",
          "value": [
            "Club Subscription",
            "Medical (non-statutory)",
            "Family Benefit",
            "Motor Car (non-commercial)"
          ]
        }
      ],
      "then": "block",
      "message": "This category is not eligible for reimbursement under IRAS Regulations 26/27. Talk to finance if you believe this is a special case."
    },
    {
      "id": "block-future-date",
      "label": "Future-dated claim",
      "when": [
        { "field": "expenseDate", "op": ">", "value": "today" }
      ],
      "then": "block",
      "message": "The expense date is in the future — submit again after the expense actually happens."
    },
    {
      "id": "block-missing-receipt-over-threshold",
      "label": "Missing receipt over S$50",
      "when": [
        { "field": "amount", "op": ">", "value": 50 },
        { "field": "receiptUrl", "op": "missing" }
      ],
      "then": "block",
      "message": "A receipt image is required for claims above S$50."
    },
    {
      "id": "block-entertainment-missing-context",
      "label": "Client Entertainment without justification",
      "when": [
        { "field": "category", "op": "==", "value": "Client Entertainment" },
        { "field": "details.businessJustification", "op": "missing" }
      ],
      "then": "block",
      "message": "Client entertainment claims must include a business justification — IRAS requires this on the record."
    },
    {
      "id": "block-entertainment-missing-client",
      "label": "Client Entertainment without named client",
      "when": [
        { "field": "category", "op": "==", "value": "Client Entertainment" },
        { "field": "details.clientCompany", "op": "missing" }
      ],
      "then": "block",
      "message": "Client entertainment claims must name the client company and contacts present."
    },
    {
      "id": "block-training-missing-justification",
      "label": "Training without justification",
      "when": [
        { "field": "category", "op": "==", "value": "Training" },
        { "field": "details.businessJustification", "op": "missing" }
      ],
      "then": "block",
      "message": "Training claims must describe how the course supports your role — required for IRAS deductibility."
    },
    {
      "id": "route-late-night-transport",
      "label": "Late-night transport",
      "when": [
        { "field": "category", "op": "==", "value": "Transport" },
        { "field": "details.travelWindow", "op": "==", "value": "Late night (22-06)" },
        { "field": "amount", "op": ">", "value": 25 }
      ],
      "then": "route-to-human",
      "message": "Late-night transport over S$25 needs a quick manager check (verifies it's a genuine OT return)."
    },
    {
      "id": "auto-approve-small-meal",
      "label": "Small meal — within allowance",
      "when": [
        { "field": "category", "op": "==", "value": "Meal" },
        { "field": "amount", "op": "<=", "value": 30 },
        { "field": "receiptUrl", "op": "present" }
      ],
      "then": "auto-approve",
      "message": "Within the standard meal allowance — no manager review needed."
    },
    {
      "id": "auto-approve-transport",
      "label": "Local transport — within allowance",
      "when": [
        { "field": "category", "op": "==", "value": "Transport" },
        { "field": "amount", "op": "<=", "value": 50 },
        { "field": "receiptUrl", "op": "present" }
      ],
      "then": "auto-approve",
      "message": "Within the local transport allowance — no manager review needed."
    },
    {
      "id": "route-meal-missing-attendees-context",
      "label": "Large meal without attendee context",
      "when": [
        { "field": "category", "op": "==", "value": "Meal" },
        { "field": "amount", "op": ">", "value": 50 },
        { "field": "details.attendeeNotes", "op": "missing" }
      ],
      "then": "route-to-human",
      "message": "Meals over S$50 need a short note on who attended so the approver can confirm it's a working meal."
    },
    {
      "id": "route-large-amount",
      "label": "Above auto-approve ceiling",
      "when": [
        { "field": "amount", "op": ">", "value": 500 }
      ],
      "then": "route-to-human",
      "message": "Above the auto-approval ceiling of S$500 — manager review required."
    }
  ]
}
```

### Rule rationale

| Rule | Why it's in the active set |
|---|---|
| `block-disallowed-category` | IRAS Regulations 26/27 already say these categories aren't claimable. Catching them at submission saves finance from having to reject them later, and educates the claimant on why. |
| `block-future-date` | Trivial sanity check; an honest mistake but worth catching before it pollutes the data. |
| `block-missing-receipt-over-threshold` | IRAS requires substantiation for tax-deductible expenses. S$50 is the standard SME informal threshold for "no need to chase the paper receipt". |
| `block-entertainment-missing-context` | Client Entertainment requires recorded business justification per IRAS regulations. |
| `block-entertainment-missing-client` | Client Entertainment requires naming the client company/contact present. |
| `block-training-missing-justification` | Training expenses must describe role relevance for tax deductibility. |
| `route-late-night-transport` | Late-night transport over S$25 requires manager confirmation for OT legitimacy. |
| `auto-approve-small-meal` | Highest-frequency claim in most SMEs; auto-approving small meals clears the bulk of the queue without losing oversight. |
| `auto-approve-transport` | Same idea — Grab/taxi/MRT claims are routine and low-risk. |
| `route-meal-missing-attendees-context` | Meals > S$50 require attendee notes for manager review. |
| `route-large-amount` | The single most useful "needs eyes" signal. Anything over S$500 deserves a manager glance even if it's a normal expense. |

### Field reference

These names must match the Prisma model in `backend/api/prisma/schema.prisma`:

`amount`, `gstAmount`, `merchant`, `category`, `expenseDate`, `receiptUrl`, `userId`.

### Operators

`==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`, `present`, `missing`, `older_than_days`, `younger_than_days`.

The `older_than_days` and `younger_than_days` operators compute against `now()` at policy-evaluation time, not at claim-display time — so the outcome is fixed at submission and does not drift if the claim sits unreviewed.

## Where the config lives

`frontend/src/data/policies.json` is the working source of truth for the demo. Backend mirrors it at `backend/api/config/policies.json` and reloads on process start.

## Frontend behaviour expected

1. **At submission**, the API responds with `{ outcome, message, ruleId }` alongside the saved claim (or a 422 with the same shape when `block`).
2. **In the claim form**, a live preflight panel shows the policy verdict before submit so the user sees what will happen without surprise.
3. **In the approver queue**, a routed claim's detail view shows the rule id and message as a hint, so the approver knows which rule routed it.
4. **A `/policies` page** (read-only) renders the active policy version, the list of rules, and effective date. This is the user-visible "company policy" for transparency under PDPA §Notification.

## Audit and PDPA tie-in

Every auto-approval writes an `AuditLog` row with `action = "auto-approved by policy"`, `performedBy = <system user id>`, `remarks = <rule id>`. This keeps the audit trail symmetric with human approvals and gives IRAS a clean reason-string per claim.

The `/policies` page satisfies the PDPA Openness principle — users can see the rules that determine whether their claim is auto-approved or routed for review.
