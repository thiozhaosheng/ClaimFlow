# Compliance

Documentation of how ClaimFlow handles data and approvals in line with Singapore SME obligations.

| File | What's in it |
|---|---|
| [data-inventory.md](./data-inventory.md) | Every schema field mapped to purpose, PDPA classification, lawful basis, retention. The reference the rest of these docs point at. |
| [pdpa.md](./pdpa.md) | Walkthrough of each PDPA obligation, what ClaimFlow does today, and what's still open. |
| [gst-iras.md](./gst-iras.md) | IRAS GST tax invoice fields, schema gaps, and the disallowed input-tax categories. |
| [retention-policy.md](./retention-policy.md) | Consolidated retention schedule and the PDPA-vs-IRAS conflict resolution. |
| [approval-policy.md](./approval-policy.md) | Spec for the company-policy layer that decides auto-approve / route / block at submission time. |
| [qa-compliance-checklist.md](./qa-compliance-checklist.md) | Acceptance test cases that exercise the behaviours described above. |

Open compliance gaps are tracked at the bottom of [pdpa.md](./pdpa.md). Each row names the owner so it can be picked up at the next sprint.
