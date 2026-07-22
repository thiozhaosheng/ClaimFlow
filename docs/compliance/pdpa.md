# PDPA Compliance

How ClaimFlow addresses each obligation under Singapore's Personal Data Protection Act 2012, and the gaps still to be closed.

Field-level classifications live in [data-inventory.md](./data-inventory.md). Retention specifics are in [retention-policy.md](./retention-policy.md).

## Why this matters for an SME claims portal

ClaimFlow handles employee identifiers (name, work email, department) tied to financial transactions and uploaded receipts. Receipt images in particular can carry incidental personal data well beyond what the form fields ask for — NRIC numbers stamped on tax invoices, home addresses on delivery receipts, payment card last four digits, signatures. Treating the claim record and the receipt with the same care is the central PDPA risk for this product.

## The nine obligations

### 1. Consent

PDPA s.13 requires consent for collection, use, or disclosure of personal data.

**Today:** New users are added by an admin seed or self-registration. There is no explicit consent capture; registration alone is treated as implied consent. This is weak.

**Required:** A consent record per user — `consentedAt` timestamp and `consentVersion` (so we know which privacy notice they agreed to). The privacy notice itself must be linked from the registration page. See data-inventory gap #1.

### 2. Notification (Purpose Limitation)

Users must be told the purpose at or before collection. Purposes are listed in `data-inventory.md`. They need to be surfaced to the user, not buried in code comments.

**Required:** A `PRIVACY_NOTICE.md` in the repo root (and a link on the registration page) listing collection purposes verbatim from the data inventory.

### 3. Access and Correction

PDPA s.21–22 give the individual a right to access their data and correct inaccuracies.

**Today:** Users can change their password via `PATCH /api/users/update-password`. They cannot:
- Download all data held about them (Data Subject Access Request — DSAR).
- Correct `name` or `department` themselves; an admin must.

**Required:** `GET /api/users/me/export` returning the user's User + Claim + AuditLog rows as JSON. See [qa-compliance-checklist.md](./qa-compliance-checklist.md) for acceptance criteria.

### 4. Accuracy

ClaimFlow must take reasonable steps to ensure data is accurate.

**Today:** Receipt OCR ("receipt parser endpoint with azure + mock fallback") extracts merchant and amount. There is no check that the user reviewed the extracted fields before submission. Inaccurate OCR results that go unchecked become inaccurate personal-data-about-suppliers.

**Required:** Form must surface extracted fields as editable, not auto-submit. The two-step receipt upload commit (`0ce26ac`) already moves in this direction — confirm it covers the GST line and merchant.

### 5. Protection

Reasonable security arrangements.

**In place:**
- `bcrypt` password hashing.
- `Helmet` security headers.
- JWT auth (`backend/auth-gateway`).
- HTTPS at the Azure edge.

**Gaps:**
- Receipt object storage access control — confirm receipt URLs are not publicly listable and require a signed/scoped URL.
- `AuditLog.remarks` is free text — frontend should warn against pasting personal data into it (data-inventory gap #4).
- Application logs (`logUtil.js`) need a review: no full email, no full receipt URL, no password hashes.

### 6. Retention Limitation

Cease retention when no longer needed for the stated purpose.

**Today:** No automated purge. Records grow forever.

**Required:** A scheduled purge of `User` records (and dependents that are not tax-relevant) 1 year after account deactivation; tax-relevant `Claim` and `AuditLog` rows kept the full 5 years per IRAS. Specifics in [retention-policy.md](./retention-policy.md).

### 7. Accuracy of Transfer / Care of Transferred Data

PDPA s.26 requires comparable protection when transferring personal data outside Singapore.

**Today:** Azure Postgres Flexible Server region is configured by the Infrastructure Lead. The receipt OCR ("azure + mock fallback") may call Azure Document Intelligence — confirm the endpoint region is Singapore or that the Standard Contractual Clauses equivalent applies.

**Required:** Document the Azure region for each service (App Service, Postgres, Blob Storage if used for receipts, Document Intelligence). If any service is outside Singapore, capture the transfer mechanism in this doc.

### 8. Openness (Privacy Policy)

A publicly accessible privacy policy and a Data Protection Officer (DPO) contact.

**Required:**
- Publish `PRIVACY_NOTICE.md` in the repo and on a `/privacy` route.
- Designate a DPO email (project lead by default until the SME assigns one) and place it in the privacy notice.

### 9. Data Breach Notification

PDPA (Amendment) Act 2020 requires notifying PDPC within 3 calendar days of assessing that a breach is notifiable, and affected individuals as soon as practicable.

**Required:** A short runbook in this folder (`breach-runbook.md`) covering: detect → contain → assess → notify. Out of scope for this PR; tracked as a follow-up.

## Gap summary

| # | Gap | Severity | Owner | Status |
|---|---|---|---|---|
| 1 | No consent capture on registration | High | Backend Lead | Open |
| 2 | DSAR export endpoint (`GET /api/users/me/export`) | Medium | Backend Lead | **Resolved** |
| 3 | No automated retention purge | Medium | Backend Lead + Infrastructure Lead | Open |
| 4 | Privacy notice + DPO contact not published | High | Tech Writer (this role) | Open |
| 5 | Azure region for OCR not documented | Medium | Infrastructure Lead | Open |
| 6 | Breach runbook missing | Medium | Tech Writer (this role) | Open |
| 7 | AuditLog.remarks accepts unvalidated free text | Low | Frontend Lead | Open |

Gaps 4 and 6 are within this role's scope and will follow in subsequent commits. Gaps 1–3, 5, 7 need cross-team coordination.
