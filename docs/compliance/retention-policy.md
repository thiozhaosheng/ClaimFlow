# Retention Policy

Consolidated retention schedule for every category of data ClaimFlow holds, plus the purge procedure.

PDPA retention limitation (s.25) and IRAS record-keeping (5 years from the end of the financial year of the transaction) interact here. Where they conflict, the longer period applies — but only to the data that the longer rule actually requires. We do not blanket-extend PDPA-bound personal data to 5 years just because the same row also carries tax-relevant data.

## Schedule

| Category | Source | Retention | Trigger | Why |
|---|---|---|---|---|
| Tax-relevant claim records | `Claim` rows where `gstAmount > 0` or amount > S$0 (i.e. all of them in practice) | 5 years after end of the financial year of `expenseDate` | Scheduled job | IRAS Record Keeping Guide |
| Audit log for tax-relevant claims | `AuditLog` rows linked to a retained `Claim` | Same as the linked claim (5 years) | Cascade with parent | IRAS — supporting evidence |
| Receipt images | Object store, referenced by `Claim.receiptUrl` | Same as the linked claim (5 years) | Cascade with parent | IRAS — substantiation |
| User profile (active employee) | `User` rows | While the account is active | Account deactivation | PDPA — purpose-bound |
| User profile (deactivated) | `User` rows after deactivation | 1 year after deactivation | Scheduled job | PDPA — needed briefly for audit reconstruction, then no longer necessary |
| User credentials (`passwordHash`) | `User.passwordHash` | Purge immediately on account deactivation | Trigger on deactivate | PDPA + reasonable security — no need to retain a credential past account life |
| Application logs (auth-gateway) | `logUtil.js` outputs | 90 days | Log rotation | Investigation window without indefinite personal-data accumulation |
| Backups | DB snapshots | 35 days (rolling) | Azure backup policy | Operational recovery window; longer backups would shadow our purge |

## Conflict resolution

If a user requests deletion under PDPA but their claims are still within the 5-year IRAS window:

1. **Do not delete the `Claim` rows** — IRAS overrides.
2. **Anonymise** the user: replace `name` with `"[redacted]"`, `email` with `"redacted-<userId>@claimflow.invalid"`, `department` with `null`.
3. **Keep** `Claim.userId` linkage intact so the tax record stays internally consistent.
4. **Delete** `passwordHash` immediately.
5. **Notify** the user that anonymisation has been performed and that the underlying transaction records are retained under IRAS s.46 of the GST Act, with a deletion date.

This approach is endorsed by the PDPC Advisory Guidelines on Key Concepts (Chapter 18) — anonymisation is an acceptable substitute for deletion where another legal obligation requires retention.

## Purge procedure

Manual until the scheduled job is built (gap data-inventory #3):

1. End of financial year + 5 years: identify `Claim` rows where `expenseDate < cutoff`.
2. Confirm no `AuditLog` row references them outside the cutoff window.
3. Delete `AuditLog` rows first (FK constraint).
4. Delete `Claim` rows.
5. Delete the corresponding receipt images from object storage.
6. Run the user anonymisation step for any `User` row whose only remaining linkage was to those purged claims.
7. Record the purge run in a separate `PURGE_LOG.md` (date, row counts, performed by) — this stays outside the database.

## What is not retained

- **JWT tokens** — issued on login, not persisted server-side.
- **OTP / password reset tokens** — single-use, expire within minutes, not retained.
- **Receipt OCR intermediate outputs** — discarded after the user confirms or rejects the extracted fields. If we ever cache OCR for cost reasons, the cache must inherit the parent claim's retention.

## QA validation

See [qa-compliance-checklist.md](./qa-compliance-checklist.md) §Retention for the specific test cases that exercise this policy.
