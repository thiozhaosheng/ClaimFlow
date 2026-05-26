# IRAS GST Compliance

What ClaimFlow must capture and retain to satisfy IRAS rules for input tax claims and record-keeping. Field-level mapping is in [data-inventory.md](./data-inventory.md).

## Why this matters

Singapore GST registration is mandatory once taxable turnover exceeds S$1 million. SMEs using ClaimFlow to substantiate input tax claims need the underlying records to survive an IRAS audit. If a receipt cannot be tied back to a valid tax invoice with the right fields, the input tax claim can be disallowed, and the SME owes the GST back plus penalties.

This document is written against the IRAS *e-Tax Guide: GST: General Guide for Businesses* and the *Record Keeping Guide for GST-registered Businesses*. Where the guide leaves a question open, we err on the side of capturing more.

## GST rate

9% from 1 January 2024. Earlier transitional rates:

| Period | Rate |
|---|---|
| Until 31 Dec 2022 | 7% |
| 1 Jan 2023 – 31 Dec 2023 | 8% |
| 1 Jan 2024 onwards | 9% |

ClaimFlow records the GST amount as captured from the receipt (`Claim.gstAmount`) rather than recomputing — receipts may span the transitional period, and supplier rounding rules differ. The GST amount is **not** derived from `amount × 9 / 109` at read time.

## Tax invoice fields — what IRAS expects

A **full tax invoice** (used when the total payable is more than S$1,000 incl. GST) must show:

1. The words "tax invoice" clearly.
2. Supplier's name, address, and GST registration number.
3. Tax invoice serial number.
4. Date of issue.
5. Customer's name and address (the SME using ClaimFlow).
6. Description of goods/services.
7. Quantity / volume.
8. Total amount payable excluding GST.
9. GST rate and GST amount.
10. Total amount payable including GST.

A **simplified tax invoice** (total payable S$1,000 or less, incl. GST) needs items 1, 2, 4, 6, and 10 only, plus a statement that the price includes GST.

## What ClaimFlow captures today vs the gap

| IRAS field | ClaimFlow field | Status |
|---|---|---|
| Supplier name | `Claim.merchant` | Captured (optional in schema — should be required for full tax invoice claims) |
| Supplier GST registration number | — | **Missing** — required on full tax invoices |
| Tax invoice serial number | — | **Missing** — IRAS expects this for full tax invoices |
| Date of issue | `Claim.expenseDate` | Captured |
| Customer name and address | (SME's own info, static) | Not stored per claim; held at the SME profile level — acceptable |
| Description of goods/services | `Claim.category` + `Claim.merchant` | Partial — category is high level; consider adding a free-text description |
| Quantity / volume | — | Not captured. Acceptable for expense claims of meals/transport/office supplies; the receipt image carries the detail |
| Total excl GST | derived (`amount − gstAmount`) | Captured by derivation |
| GST rate | implied by date | Not stored explicitly; can be reconstructed from `expenseDate` |
| GST amount | `Claim.gstAmount` | Captured |
| Total incl GST | `Claim.amount` | Captured |
| Receipt image | `Claim.receiptUrl` | Captured (substantiates everything above) |

## Required schema changes (for the Backend Lead)

To raise this from "mostly compliant" to "audit-ready":

1. Add `Claim.supplierGstRegNumber String?` — present only when the supplier is GST-registered. Validation: matches `M[0-9]{8}[0-9A-Z]` or `[0-9]{9}[0-9A-Z]` (the two IRAS formats).
2. Add `Claim.taxInvoiceNumber String?` — required when `amount > 1000`.
3. Add `Claim.description String?` — short free text for "goods/services" beyond `category`.
4. Add a validation rule: when `amount > 1000`, `supplierGstRegNumber`, `taxInvoiceNumber`, and `receiptUrl` must all be present.

These are tracked as data-inventory gap #2.

## Input tax claim eligibility (what users should know)

ClaimFlow should warn the user before submission if the claim is **not** eligible for input tax recovery. Disallowed categories under Regulations 26 and 27 include:

- Club subscriptions for recreation, social, or sporting purposes.
- Medical expenses (except where statutorily required, e.g. Work Injury Compensation Act).
- Family benefits (except where it is a standard contractual benefit and the cost is recovered).
- Motor cars (except commercial vehicles).
- Insurance / accident damages where the cost is recovered from the insurer.

A pre-submission hint based on `Claim.category` is the right place to surface this. Implementation belongs to the Frontend Lead; the category-to-eligibility mapping is captured in [approval-policy.md](./approval-policy.md).

## Record retention

IRAS requires GST-registered businesses to keep records for **5 years** from the end of the financial year to which the transactions relate. This is stricter than the PDPA retention principle, so it overrides shorter retention periods for any field on `Claim` or `AuditLog`. See [retention-policy.md](./retention-policy.md) for the consolidated schedule.

## Reporting alignment

ClaimFlow does not file GST F5 returns on the SME's behalf. It must, however, be able to **export** a date-range of claims with the GST breakdown in a format the SME can paste into their F5 working papers. The DSAR export proposed in [pdpa.md](./pdpa.md) §3 should be a superset of what GST export needs, so a single CSV/JSON export endpoint can serve both.
