# ClaimFlow REST API

The production API lives in `backend/api/` (TypeScript + Express + Prisma). All
endpoints are mounted under `/api`. This documents `backend/api` directly —
the frontend never calls it directly, only through `backend/auth-gateway`
(see the root README), which proxies a subset of these routes.

- **Local:** `http://localhost:<PORT>` — see `backend/api/.env.example` for the
  default (kept distinct from the gateway and frontend's own ports so all
  three can run at once)
- **Live (Azure App Service):** see Infrastructure team
- **Interactive docs (Swagger UI):** `http://localhost:<PORT>/api/docs` while the API is running

All requests and responses are JSON unless noted. Errors follow the shape
`{ "status": "error", "message": "..." }` with the appropriate HTTP status.

---

## Auth

### `POST /api/auth/login`
Public. Issues a JWT signed with `JWT_SECRET`, valid for `JWT_EXPIRES_IN`
(default `1d`).

Body:
```json
{ "email": "demo.employee@claimflow.com", "password": "claimflow-demo" }
```

Response `200 OK`:
```json
{
  "status": "success",
  "token": "<jwt>",
  "data": {
    "user": {
      "id": 1,
      "name": "Demo Employee",
      "email": "demo.employee@claimflow.com",
      "role": "Employee",
      "department": "Engineering"
    }
  }
}
```

### `GET /api/auth/me`
Requires `Authorization: Bearer <token>`. Returns the current user.

### `POST /api/auth/forgot-password`
Public. Starts a password reset (see `auth.controller.ts` for the current
flow — this endpoint predates most of the rest of this doc, verify against
source before relying on exact request/response shape).

---

## Users

### `GET /api/users/profile`
Authenticated. Same payload as `/auth/me`, kept for backwards compatibility with
the original frontend SDK.

### `GET /api/users/`
Authenticated. Returns the user directory (id, name, email, role, department).
Used by manager/finance views to display approver/employee names.

### `POST /api/users/register`
Public. Self-service registration for new employees.

Body:
```json
{
  "name": "Jane Tan",
  "email": "jane@example.com",
  "password": "<min 8 chars>",
  "role": "Employee",
  "department": "Marketing"
}
```

### `POST /api/users/verify`
Public. Lightweight email-exists check used by the frontend before showing the
password field on sign-in.

### `PATCH /api/users/update-password`
Authenticated.

Body: `{ "email": "...", "newPassword": "..." }`

---

## Claims

All routes below require `Authorization: Bearer <token>` (enforced at the
router level).

### `POST /api/claims/`
Submit a new claim.

Body:
```json
{
  "amount": 145.50,
  "gstAmount": 12.05,
  "merchant": "Din Tai Fung",
  "category": "Meal",
  "expenseDate": "2026-05-11",
  "receiptUrl": "2026/05/<uuid>.jpg"
}
```

`receiptUrl` is the blob name returned by `/parse-receipt` (see below). It is
optional; the policy engine blocks claims above S$50 with no receipt on both
sides — the frontend checks it before submitting for instant feedback, and
this endpoint independently re-checks and returns `422` with the policy
message if the rule is violated, so the check can't be bypassed by calling
the API directly.

### `GET /api/claims/my`
Returns the authenticated user's own claims.

### `GET /api/claims/`
Manager + Finance Admin only. Returns all claims (used by approval queue and
finance views).

### `GET /api/claims/:id`
Returns one claim. Visible to the claim owner, any Manager, or Finance Admin.

### `GET /api/claims/:id/receipt`
Returns a short-lived SAS view URL for the claim's receipt blob (15 minute TTL).
```json
{ "status": "success", "data": { "viewUrl": "https://...?sv=...&sig=..." } }
```
Used by the claim detail modal to render the receipt thumbnail without exposing
the storage account.

### `GET /api/claims/:id/activity`
Returns the audit-log entries for one claim (submission, endorsement,
rejection, comments, withdrawal), newest first. Powers the claim detail
page's activity feed.

### `POST /api/claims/:id/comment`
Adds a free-text comment to a claim's audit trail. Body: `{ "commentText": "..." }`.

### `PATCH /api/claims/:id/withdraw`
Claim owner only, and only while `status` is `Pending`. Soft-deletes the
claim (`withdrawn: true`) — it disappears from active views but the row
stays for dispute retrieval.

### `PATCH /api/claims/:id`
Claim owner only. Edits fields on a not-yet-finalized claim (e.g.
correcting a GST amount flagged by the policy engine).

### `POST /api/claims/parse-receipt`
Two-step receipt upload. Accepts `multipart/form-data` with a single `receipt`
field. The image is uploaded to Azure Blob Storage and parsed by Azure
Document Intelligence (`prebuilt-receipt` model). Accepted MIME types:
`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`,
`application/pdf`. Max size 10 MB.

Response `200 OK`:
```json
{
  "status": "success",
  "data": {
    "merchant": "Din Tai Fung",
    "total": 145.90,
    "gstAmount": 12.05,
    "currency": "SGD",
    "expenseDate": "2026-05-11",
    "category": "Meal",
    "source": "azure",
    "receiptUrl": "2026/05/<uuid>.jpg",
    "viewUrl": "https://<account>.blob.core.windows.net/receipts/...?<sas>"
  }
}
```

`source` indicates where the parsed fields came from:
- `azure` — real Azure Document Intelligence result
- `unavailable` — Azure isn't configured, timed out, or rejected the file — all
  fields come back `null`. There is no mock/fake-data fallback: a receipt is
  either really read or the form is left for the user to fill in by hand.
  `details.ocrIncomplete`/`details.ocrMissingFields` on the created claim
  record which specific fields (if any) couldn't be read.

The frontend pre-fills the claim form from this response, then submits via
`POST /api/claims/` once the user confirms or edits the fields.

---

## Workflow

All routes require `Authorization: Bearer <token>`.

### `PATCH /api/workflow/review/:id`
Manager or Finance Admin. Endorse or reject a Pending claim.

Body:
```json
{ "action": "approve", "remarks": "Receipt verified." }
```

`action` must be `"approve"` or `"reject"`. Valid transitions:
- `Pending` → `Endorsed` (approve)
- `Pending` → `Rejected` (reject)
- `Endorsed` → `Rejected` (reject)

### `PATCH /api/workflow/pay/:id`
Finance Admin only. Marks an `Endorsed` claim as `Paid` once disbursement is
done. Writes an audit log entry.

### `GET /api/workflow/audit`
Finance Admin only. Returns the full audit trail (one entry per state change),
joined with claim, executor, and old/new status. Used to render the Audit Trail
tab and to export CSV.

---

## Notifications

All routes require `Authorization: Bearer <token>` and are scoped to the
signed-in user's own notifications.

### `GET /api/notifications/my`
Returns up to 30 notifications, newest first, plus an unread count.

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1, "recipientId": 7, "claimId": 42,
        "kind": "ocr-incomplete",
        "title": "Manual review needed: Sarah Tan",
        "body": "Transport · Grab · S$23.10",
        "hint": "OCR couldn't read: Date — the submitter entered this by hand. Verify against the receipt image.",
        "readAt": null, "createdAt": "2026-07-08T03:24:17.000Z"
      }
    ],
    "unread": 1
  }
}
```

`kind` values in current use: `auto-endorsed`, `route-to-human`,
`ocr-unavailable`, `ocr-incomplete`, `receipt-needs-attention`,
`claim-endorsed`, `claim-rejected`, `claim-paid`, `claim-edited`. See
`claim.controller.ts` for exactly which actions fire which kind.

### `PATCH /api/notifications/read-all`
Marks every unread notification for the current user as read.

### `PATCH /api/notifications/:id/read`
Marks one notification as read. Scoped to the recipient — cannot mark
someone else's notification.

---

## Domain enums

```
Role        = Employee | Manager | FinanceAdmin
ClaimStatus = Pending | Endorsed | Rejected | Paid
```

These match the Prisma schema in `backend/api/prisma/schema.prisma`. The
historical names `Submitted` / `Approved` / `Reimbursed` are gone — see
`backend/api/prisma/rename_statuses_match_frontend.sql` for the one-time
migration applied to the shared dev DB.

---

## Claim shape (response object)

```json
{
  "id": 42,
  "userId": 7,
  "user": { "id": 7, "name": "...", "email": "...", "department": "..." },
  "amount": "145.50",
  "gstAmount": "12.05",
  "merchant": "Din Tai Fung",
  "category": "Meal",
  "expenseDate": "2026-05-11T00:00:00.000Z",
  "receiptUrl": "2026/05/<uuid>.jpg",
  "ocrSource": "azure",
  "details": { "ocrIncomplete": false, "title": "Team lunch" },
  "status": "Endorsed",
  "withdrawn": false,
  "withdrawnAt": null,
  "createdAt": "2026-05-11T03:24:17.000Z",
  "updatedAt": "2026-05-12T01:02:08.000Z"
}
```

`ocrSource` is `"azure" | "unavailable" | null` (`null` means no OCR was
attempted — pure manual entry). `details` is an arbitrary JSON bag —
category-specific fields plus `ocrIncomplete`/`ocrMissingFields` when the
scan didn't fully read the receipt. `withdrawn`/`withdrawnAt` are set when
the submitter withdraws a still-Pending claim (soft delete — the row stays
for dispute retrieval, see `PATCH /api/claims/:id/withdraw`).

Decimal fields (`amount`, `gstAmount`) are serialised as strings by Prisma to
avoid floating-point loss. The frontend parses them back with `Number(...)`
inside `useClaims`.

---

## Environment variables (backend)

See `backend/api/.env.example` for the full list. Required:

- `DATABASE_URL` — Postgres connection string, special chars URL-encoded
- `JWT_SECRET` — strong random value
- `JWT_EXPIRES_IN` — token TTL (e.g. `1d`)
- `CORS_ORIGINS` — comma-separated allowlist. In practice this only matters if
  something calls `backend/api` directly from a browser — the frontend only
  ever talks to `backend/auth-gateway`, and that's a server-to-server call.

Optional (each unlocks a feature):

- `AZURE_DOC_INTEL_ENDPOINT`, `AZURE_DOC_INTEL_KEY` — real OCR via Azure Document Intelligence. Without both, or if Azure fails/times out, `/parse-receipt` returns `source: "unavailable"` with every field `null` — no mock data.
- `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER` (default `receipts`) — receipt image archive. Without the connection string, uploads are skipped and `receiptUrl` stays null.
- `RECEIPT_DEBUG=1` — log the raw Azure field response (first 2 KB) to the server console; use while debugging OCR misreads.
- `HITPAY_API_KEY`, `HITPAY_SALT` — disbursement gateway (not wired up at time of writing).

---

*Generated from the live routes in `backend/api/src/routes/` and the Prisma
schema. Keep this file in sync when adding endpoints or changing field shapes.*
