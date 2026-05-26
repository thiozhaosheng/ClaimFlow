# Approval Policy

Specification for the company-policy layer that decides which claims auto-approve, which need a human reviewer, and which must be rejected at submission.

This is the manual configuration that bridges the current "approver reads every claim" workflow and the eventual ML-assisted version.

## Problem we are solving

Today, every submitted claim sits in `Submitted` status until a Manager or FinanceAdmin reviews it. With dozens to hundreds of claims a week this becomes a queue the approver cannot keep up with, and obvious-correct claims get blocked behind borderline ones.

The fix is a policy layer that runs at submission time and assigns one of three outcomes:

| Outcome | What happens |
|---|---|
| **auto-approve** | Claim moves to `Approved` immediately. Audit log records `auto-approved by policy <rule id>`. |
| **route-to-human** | Claim stays `Submitted`. Reviewer sees the policy hits as hints. |
| **block** | Claim never enters `Submitted`. The frontend shows the reason inline; nothing is persisted. |

The policy is the same configuration that determines the **IRAS input-tax-eligibility hint** ([gst-iras.md](./gst-iras.md) §Input tax claim eligibility), so the eligibility check and the approval policy share one source of truth.

## Policy rules — the starter set

Each rule is `{ id, when, then, message }`. `when` is a list of conditions ANDed together. `then` is one of `auto-approve` / `route-to-human` / `block`. The first matching rule wins; if nothing matches, the default is `route-to-human`.

```json
{
  "version": "2026-05-26",
  "currency": "SGD",
  "rules": [
    {
      "id": "block-disallowed-category",
      "when": [{ "field": "category", "op": "in", "value": ["Club Subscription", "Medical (non-statutory)", "Family Benefit", "Motor Car (non-commercial)"] }],
      "then": "block",
      "message": "This category is not eligible for input tax claim under IRAS Regulations 26/27. See your finance team if this is a one-off."
    },
    {
      "id": "block-missing-receipt-over-threshold",
      "when": [
        { "field": "amount", "op": ">", "value": 50 },
        { "field": "receiptUrl", "op": "missing" }
      ],
      "then": "block",
      "message": "A receipt image is required for claims above S$50."
    },
    {
      "id": "block-future-date",
      "when": [{ "field": "expenseDate", "op": ">", "value": "today" }],
      "then": "block",
      "message": "The expense date cannot be in the future."
    },
    {
      "id": "block-stale-claim",
      "when": [{ "field": "expenseDate", "op": "older_than_days", "value": 90 }],
      "then": "block",
      "message": "Claims older than 90 days require finance-admin override. Email finance with the original receipt."
    },
    {
      "id": "auto-approve-small-meal",
      "when": [
        { "field": "category", "op": "==", "value": "Meal" },
        { "field": "amount", "op": "<=", "value": 30 },
        { "field": "receiptUrl", "op": "present" }
      ],
      "then": "auto-approve",
      "message": "Within meal allowance."
    },
    {
      "id": "auto-approve-transport",
      "when": [
        { "field": "category", "op": "==", "value": "Transport" },
        { "field": "amount", "op": "<=", "value": 50 },
        { "field": "receiptUrl", "op": "present" }
      ],
      "then": "auto-approve",
      "message": "Within transport allowance."
    },
    {
      "id": "auto-approve-office-supplies",
      "when": [
        { "field": "category", "op": "==", "value": "Office Supplies" },
        { "field": "amount", "op": "<=", "value": 100 },
        { "field": "receiptUrl", "op": "present" }
      ],
      "then": "auto-approve",
      "message": "Standard office supply purchase."
    },
    {
      "id": "route-tax-invoice-required",
      "when": [
        { "field": "amount", "op": ">", "value": 1000 },
        { "field": "supplierGstRegNumber", "op": "missing" }
      ],
      "then": "route-to-human",
      "message": "Full tax invoice fields are missing. Finance to verify before approving."
    },
    {
      "id": "route-large-amount",
      "when": [{ "field": "amount", "op": ">", "value": 500 }],
      "then": "route-to-human",
      "message": "Above auto-approval ceiling; manager review."
    }
  ]
}
```

### Field reference

These names must match the Prisma model in `backend/api/prisma/schema.prisma` exactly:

`amount`, `gstAmount`, `merchant`, `category`, `expenseDate`, `receiptUrl`, `userId`, `supplierGstRegNumber` (after the GST gap is closed — see [gst-iras.md](./gst-iras.md) §Required schema changes).

### Operators

`==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`, `present`, `missing`, `older_than_days`, `younger_than_days`.

The `older_than_days` and `younger_than_days` operators compute against `now()` at policy-evaluation time, not at claim-display time — so the outcome is fixed at submission and does not drift if the claim sits unreviewed.

## Where the config lives

When the Backend Lead is ready to wire it in, the JSON above should live at `backend/api/config/policies.json` and be reloaded on process start. Hot-reload is out of scope for v1.

Until then, the rules above act as a written specification — the same source of truth the QA tests reference.

## Frontend behaviour expected

For the Frontend Lead, the contract is:

1. **At submission**, the API responds with `{ outcome, message, ruleId }` alongside the saved claim (or a 422 with the same shape when `block`).
2. **On the claim list**, an auto-approved claim shows an "Auto-approved" badge with the rule id on hover.
3. **On the approver queue**, a routed claim shows the rule id and message as a hint, so the approver knows which rule routed it.
4. **A `/policies` page** (read-only) renders the active policy version, the list of rules, and effective date. This is the user-visible "company policy" for transparency under PDPA §Notification.

The wire format and page wireframes belong in `docs/api_doc.md` and the design board — coordinate with Lead Frontend before implementation.

## Migration path

| Phase | What | Owner | When |
|---|---|---|---|
| 0 | Rules as spec only (this doc) | Tech Writer | Now |
| 1 | `policies.json` checked in, loaded by backend, evaluated synchronously at `POST /api/claims` | Backend Lead | Next sprint |
| 2 | Frontend shows badges + `/policies` page | Frontend Lead | Next sprint |
| 3 | Rule editor UI for FinanceAdmin (so policies change without a deploy) | Frontend + Backend | Sprint after |
| 4 | ML scoring augments / replaces hand-written rules for the `route-to-human` segment | Future | Beyond capstone |

## Audit and PDPA tie-in

Every auto-approval writes an `AuditLog` row with `action = "auto-approved by policy"`, `performedBy = <system user id>`, `remarks = <rule id>`. This keeps the audit trail symmetric with human approvals and gives IRAS a clean reason-string per claim.

The `/policies` page satisfies the PDPA Openness principle — users can see the rules that determine whether their claim is auto-approved or routed for review.
