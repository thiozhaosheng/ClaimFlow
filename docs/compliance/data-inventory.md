# Data Inventory

Maps every field in the ClaimFlow data model to its purpose, PDPA classification, lawful basis for collection, and retention period. This is the source-of-truth that the rest of the compliance docs reference.

Schema source: `backend/api/prisma/schema.prisma`.

## Classifications used

- **Personal Data** — data about an identified or identifiable individual (PDPA s.2).
- **Sensitive** — personal data whose unauthorised disclosure carries higher risk (e.g. financial transactions tied to a named person, scanned receipts that may reveal location/health/membership). PDPA does not define a separate "sensitive" tier, but we treat these with stricter access controls.
- **Operational** — non-personal system data (IDs, timestamps, status enums).

## User

| Field | Type | Purpose | Classification | Lawful basis | Retention |
|---|---|---|---|---|---|
| `id` | int | Internal identifier | Operational | — | Until account purge |
| `name` | string | Display name on claims and audit trail | Personal | Necessary for performance of the employment relationship | Account active + 1 year |
| `email` | string (unique) | Login + notification | Personal | Consent at registration | Account active + 1 year |
| `passwordHash` | string | Authentication | Personal (credential) | Necessary for the service | Purged immediately on account deletion |
| `role` | enum (Employee / Manager / FinanceAdmin) | Authorisation | Operational | — | Account active + 1 year (for audit reconstruction) |
| `department` | string (optional) | Routing claims to the correct approver | Personal | Necessary for the service | Account active + 1 year |
| `createdAt` | datetime | Account audit | Operational | — | Account active + 1 year |

## Claim

| Field | Type | Purpose | Classification | Lawful basis | Retention |
|---|---|---|---|---|---|
| `id` | int | Internal identifier | Operational | — | 5 years (IRAS — see [gst-iras.md](./gst-iras.md)) |
| `userId` | int | Claimant linkage | Personal (linkage) | Necessary for the service | 5 years |
| `amount` | decimal(10,2) | Reimbursement total | Sensitive (financial) | Necessary for the service | 5 years (IRAS) |
| `gstAmount` | decimal(10,2) | GST portion for input tax claim | Sensitive (financial) | Necessary for IRAS GST reporting | 5 years (IRAS) |
| `merchant` | string (optional) | Supplier identification on the receipt | Personal (third party) | Necessary for the service | 5 years (IRAS) |
| `category` | string | Expense classification | Operational | — | 5 years |
| `expenseDate` | datetime | When the expense was incurred | Operational | — | 5 years (IRAS) |
| `receiptUrl` | string (optional) | Pointer to the receipt image | Sensitive (may contain NRIC, location, signature, payment card last 4) | Necessary for IRAS substantiation | 5 years (IRAS); the underlying image inherits the same retention |
| `status` | enum | Workflow state | Operational | — | 5 years |
| `createdAt` / `updatedAt` | datetime | Audit | Operational | — | 5 years |

## AuditLog

| Field | Type | Purpose | Classification | Lawful basis | Retention |
|---|---|---|---|---|---|
| `id` | int | Internal identifier | Operational | — | 5 years (tied to the claim) |
| `claimId` | int | Claim linkage | Operational | — | 5 years |
| `action` | string | What was performed | Operational | — | 5 years |
| `performedBy` | int (user id) | Accountability | Personal (linkage) | Necessary for the service | 5 years |
| `oldStatus` / `newStatus` | enum | State transition | Operational | — | 5 years |
| `remarks` | string (optional) | Free text — may contain personal data | Personal (variable) | Necessary for the service | 5 years; redaction recommended at the source |
| `createdAt` | datetime | Audit | Operational | — | 5 years |

## Out-of-band data we know exists

These are not in the Prisma schema today but flow through the system and need a classification entry:

- **Receipt image binaries** (referenced by `Claim.receiptUrl`) — held in object storage. May contain NRIC, photo, address, payment card last 4, signature. Treat as Sensitive. Retention follows the parent claim (5 years IRAS).
- **JWT access tokens** — short-lived credentials. Not persisted server-side once issued. Not in scope for DSAR.
- **Application logs** (`backend/auth-gateway/src/logUtil.js`) — must not log full receipt URLs, password hashes, or full email. See [retention-policy.md](./retention-policy.md) for log retention.

## Open gaps (to be closed)

| # | Gap | Owner | Doc reference |
|---|---|---|---|
| 1 | `User` has no `consentedAt` / `consentVersion` field | Backend Lead | [pdpa.md](./pdpa.md) §Consent |
| 2 | `Claim` has no supplier GST registration number — required on full tax invoices > S$1,000 | Backend Lead | [gst-iras.md](./gst-iras.md) §Tax invoice fields |
| 3 | No soft-delete / scheduled purge mechanism — retention is documented but not enforced | Backend Lead | [retention-policy.md](./retention-policy.md) |
| 4 | `AuditLog.remarks` accepts free text — risk of unintended personal data leakage | Frontend Lead (input validation) | [pdpa.md](./pdpa.md) §Protection |
