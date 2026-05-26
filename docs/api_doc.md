# ClaimFlow REST API

The production API lives in `backend/api/` (TypeScript + Express + Prisma). All
endpoints are mounted under `/api`.

- **Local:** `http://localhost:4000`
- **Live (Azure App Service):** see Infrastructure team
- **Interactive docs (Swagger UI):** `http://localhost:4000/api/docs` while the API is running

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
optional; claims above S$50 without a receipt are blocked client-side by the
policy engine.

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
- `mock` — Azure env vars are not configured; deterministic fixture data (dev only)
- `unavailable` — Azure was configured but rejected the file (form returns empty fields)

The frontend pre-fills the claim form from this response, then submits via
`POST /api/claims/` once the user confirms or edits the fields.

---

## Workflow

All routes require `Authorization: Bearer <token>`.

### `PATCH /api/workflow/review/:id`
Manager or Finance Admin. Endorse or reject a Pending claim.

Body:
```json
{ "status": "Endorsed", "remarks": "Receipt verified." }
```

Valid `status` transitions:
- `Pending` → `Endorsed` (manager endorses)
- `Pending` → `Rejected` (manager rejects)
- `Endorsed` → `Rejected` (finance kicks back to employee)

### `PATCH /api/workflow/pay/:id`
Finance Admin only. Marks an `Endorsed` claim as `Paid` once disbursement is
done. Writes an audit log entry.

### `GET /api/workflow/audit`
Finance Admin only. Returns the full audit trail (one entry per state change),
joined with claim, executor, and old/new status. Used to render the Audit Trail
tab and to export CSV.

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
  "status": "Endorsed",
  "createdAt": "2026-05-11T03:24:17.000Z",
  "updatedAt": "2026-05-12T01:02:08.000Z"
}
```

Decimal fields (`amount`, `gstAmount`) are serialised as strings by Prisma to
avoid floating-point loss. The frontend parses them back with `Number(...)`
inside `useClaims`.

---

## Environment variables (backend)

See `backend/api/.env.example` for the full list. Required:

- `DATABASE_URL` — Postgres connection string, special chars URL-encoded
- `JWT_SECRET` — strong random value
- `JWT_EXPIRES_IN` — token TTL (e.g. `1d`)
- `CORS_ORIGINS` — comma-separated allowlist (include Vite dev server)

Optional (each unlocks a feature):

- `AZURE_DOC_INTEL_ENDPOINT`, `AZURE_DOC_INTEL_KEY` — real OCR via Azure Document Intelligence. Without both, `/parse-receipt` returns `source: "mock"` with deterministic fixtures.
- `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER` (default `receipts`) — receipt image archive. Without the connection string, uploads are skipped and `receiptUrl` stays null.
- `RECEIPT_DEBUG=1` — log the raw Azure field response (first 2 KB) to the server console; use while debugging OCR misreads.
- `HITPAY_API_KEY`, `HITPAY_SALT` — disbursement gateway (not wired up at time of writing).

---

*Generated from the live routes in `backend/api/src/routes/` and the Prisma
schema. Keep this file in sync when adding endpoints or changing field shapes.*
