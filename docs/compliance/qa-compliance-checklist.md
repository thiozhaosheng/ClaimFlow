# QA Compliance Checklist

Concrete acceptance tests that exercise the behaviours described in [pdpa.md](./pdpa.md), [gst-iras.md](./gst-iras.md), [retention-policy.md](./retention-policy.md), and [approval-policy.md](./approval-policy.md).

Each item is phrased as "Given / When / Then" so it maps directly to a test case. Items that depend on a gap still being closed are tagged **[blocked]**.

## A. Consent and notification

**A1.** Given a fresh registration, when the user submits the form, then a `consentedAt` timestamp and `consentVersion` are persisted on the User row.  **[blocked — data-inventory gap #1]**

**A2.** Given a logged-in user, when they visit `/privacy`, then the current Privacy Notice loads with the same `consentVersion` they signed.

**A3.** Given a privacy notice update bumps `consentVersion`, when an existing user logs in, then they are prompted to re-consent before any claim action.  **[blocked — data-inventory gap #1]**

## B. Access and correction (DSAR)

**B1.** Given a logged-in user, when they call `GET /api/users/me/export`, then the response contains every User, Claim, AuditLog, and receipt URL belonging to that user, and only that user.  **[blocked — pdpa gap #2]**

**B2.** Given the DSAR response in B1, when the response is opened, then no other user's identifiers appear anywhere — including in `AuditLog.performedBy` where another user approved a claim (replace with role label instead of name).

**B3.** Given a Manager calls the same export endpoint, when the request is processed, then they receive only their own data, not their reportees'. (Role does not widen DSAR scope.)

## C. Receipt handling

**C1.** Given a user uploads a receipt, when the upload completes, then the receipt URL is not publicly listable — accessing it without a valid session returns 401/403.

**C2.** Given an OCR run extracts merchant / amount / GST, when the user submits without changes, then the submission form has surfaced the extracted fields as editable inputs (not silently accepted).

**C3.** Given a receipt image is deleted by purge, when the parent claim still exists within IRAS retention, then the claim row carries a `receiptPurgedAt` timestamp explaining the missing image.

## D. IRAS GST

**D1.** Given a claim with `amount > 1000`, when the form is submitted without `supplierGstRegNumber` or `taxInvoiceNumber`, then submission is rejected with a message naming the missing fields.  **[blocked — gst-iras schema gap]**

**D2.** Given a claim of S$1,000 or less, when submitted with the simplified-invoice fields only, then it is accepted.

**D3.** Given an expense dated 2023-06-15 (8% GST era), when the claim is rendered, then the displayed GST does not silently change to 9%. (The stored value must be the value at the time of the transaction.)

**D4.** Given the policy rule `block-disallowed-category` fires, when the user attempts to submit a Medical (non-statutory) expense, then submission is blocked at the API and the frontend shows the rule's message.

**D5.** Given a date-range export request, when finance pulls a quarter, then the export includes every `Claim` field needed for GST F5 working papers (amount excl GST, GST amount, amount incl GST, supplier GST reg number, tax invoice number, expense date).

## E. Retention

**E1.** Given a User row marked `deactivated`, when the deactivation occurs, then `passwordHash` is set to empty in the same transaction.

**E2.** Given a User deactivated 366 days ago, when the purge job runs, then the User row is anonymised per [retention-policy.md](./retention-policy.md) §Conflict resolution — not deleted, because their Claims are still within IRAS retention.

**E3.** Given a Claim with `expenseDate` 5 years and 1 day ago plus end-of-FY boundary, when the purge job runs, then the Claim, its AuditLog rows, and its receipt image are all removed.

**E4.** Given the auth-gateway log rotation runs, when 91 days have passed, then logs older than 90 days are no longer on the application file system.

## F. Approval policy

**F1.** Given the rule `auto-approve-small-meal`, when a Meal claim of S$28 with a receipt is submitted, then the claim is created in `Approved` status and an AuditLog row records `auto-approved by policy auto-approve-small-meal`.

**F2.** Given the rule `route-large-amount`, when a S$501 claim is submitted, then status is `Submitted` and the API response carries `{ outcome: "route-to-human", ruleId: "route-large-amount", message: ... }`.

**F3.** Given the rule `block-stale-claim`, when a claim is submitted with `expenseDate` 91 days ago, then no Claim row is created and the API returns 422 with the rule's message.

**F4.** Given two rules could match a claim, when the policy runs, then the first rule in the JSON is the one whose outcome is used. (Order determines precedence.)

**F5.** Given the `/policies` page, when a non-authenticated user loads it, then they still see the rules in read-only form — this satisfies the PDPA Openness obligation regardless of login state.

## G. Audit trail integrity

**G1.** Given any status transition (manual or auto), when the transition completes, then an AuditLog row with `oldStatus`, `newStatus`, `performedBy`, and `createdAt` exists.

**G2.** Given an AuditLog row exists, when any process attempts to update it, then the update is rejected (logs are append-only).

**G3.** Given a Claim is deleted by purge, when the deletion runs, then its AuditLog rows are deleted in the same transaction — no orphan audit rows pointing to a missing claim.

## How to run these

Until the test harness is in place, work through this checklist manually against the local stack (`backend/api` + `frontend/login-dashboard`). Each item should be re-run before any release that touches the claims pipeline.

When the team adds a test runner, every `**` line above becomes a test case id. The blocked items stay in the file as `.skip` placeholders so they appear in the report and remind us they exist.
