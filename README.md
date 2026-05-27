# ClaimFlow

Role-based expense claim portal for Singapore SMEs. Capstone project for NP-CET DFS IP Run 2.

The app has three roles:

- **Employee** uploads a receipt. OCR reads the amount, merchant, GST, date, route and time, then auto-fills the per-category fields on the claim form.
- **Approving Officer** gets pending claims in a queue. Each one shows which policy rule was triggered and why, and the officer can endorse or return it.
- **Finance Admin** has a dashboard, batch-pays endorsed claims, and exports the audit trail. Spend totals, policy outcomes and top claimants are computed from live data.

A policy engine routes every submission. Small in-budget claims auto-endorse and notify the approver for spot-checking. Claims with missing receipts, IRAS-disallowed categories, future dates, or OCR failures are either blocked or sent for manual review.

## Team

| Name | Role |
|---|---|
| Ang Bi Jun | Lead Frontend Engineer |
| Wong Sin Yaw | Lead Backend Engineer |
| Travis Thio | Lead Infrastructure Engineer |
| Wong Lian Yi Daniel | Lead QA & Technical Writer |

## Stack

**Frontend**

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix-000000?style=for-the-badge)
![Recharts](https://img.shields.io/badge/Recharts-3-FF6384?style=for-the-badge)
![lucide-react](https://img.shields.io/badge/lucide--react-icons-F56565?style=for-the-badge)
![Geist](https://img.shields.io/badge/Geist-typeface-000000?style=for-the-badge)

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![bcrypt](https://img.shields.io/badge/bcrypt-Hashing-525252?style=for-the-badge)
![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Helmet](https://img.shields.io/badge/Helmet-Headers-0F0F0F?style=for-the-badge)
![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

**Database**

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

**Cloud services**

![Azure Postgres](https://img.shields.io/badge/Azure%20Postgres-Flexible%20Server-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![Azure Document Intelligence](https://img.shields.io/badge/Azure%20Doc%20Intelligence-prebuilt--receipt-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)
![Azure Blob Storage](https://img.shields.io/badge/Azure%20Blob%20Storage-receipts-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)

## Run it locally

Requirements: Node.js 20 LTS (or newer), npm, and Postgres 14+. You can point at the project's Azure Postgres Flexible Server using a `DATABASE_URL`, or run a local Postgres. The OCR and receipt storage features need Azure keys; without them, OCR falls back to a deterministic mock and uploads aren't archived.

```bash
git clone https://github.com/thiozhaosheng/ClaimFlow.git
cd ClaimFlow
```

### 1. Backend API

```bash
cd backend/api
cp .env.example .env
# Edit .env and set at minimum:
#   DATABASE_URL=...   (URL-encode any special chars in the password)
#   JWT_SECRET=...     (generate one: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
# Optional, for the OCR / blob-storage features:
#   AZURE_DOC_INTEL_ENDPOINT, AZURE_DOC_INTEL_KEY
#   AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_CONTAINER

npm install

# Generates the Prisma client, pushes the schema (db push with advisory-lock
# disabled, since `prisma migrate dev` hangs on Azure Postgres Flexible
# Server), then seeds 28 users and ~135 demo claims.
npm run db:setup

# Make sure PORT in .env is 4000 (the frontend expects this). If you change
# it, also update VITE_API_BASE_URL in frontend/.env to match.
npm run dev   # http://localhost:4000
```

The API will print `Database connected successfully.` and `ClaimFlow API listening on port 4000` when it's up. Swagger UI is at `http://localhost:4000/api/docs`.

### 2. Frontend (web client)

```bash
cd ../../frontend           # from backend/api
cp .env.example .env
# Default .env points at VITE_API_BASE_URL=http://localhost:4000. Leave it
# as-is if you ran the backend with the steps above.
#
# Don't set VITE_MOCK_API=true (and check that .env.local doesn't override
# it). The mock bypasses the real backend and Azure OCR.

npm install
npm run dev   # http://localhost:3004 (vite.config.js — change there if the port is taken)
```

Open the URL Vite prints. The sign-in page has three one-click demo accounts.

### Demo accounts

The seed creates 28 users in total. Three are stable demo accounts used in the sign-in panel:

| Role | Email | Password |
|---|---|---|
| Employee | demo.employee@claimflow.com | claimflow-demo |
| Approving Officer | demo.manager@claimflow.com | claimflow-demo |
| Finance Admin | demo.finance@claimflow.com | claimflow-demo |

The other 25 named users (across Sales, Engineering, Marketing, Operations, Customer Success and HR) populate the queues and the finance dashboard. Avatars are served from `pravatar.cc` per email.

## Walk-through

1. **Sign in as Employee** (demo.employee@claimflow.com). Open the "Demo fixtures" panel on the right and download `grab-transport.pdf`. Start a new claim, drop the PDF on the receipt area, and the form should auto-fill the merchant, amount, GST, date, From/To and time-of-day. Submit. You'll get an "Auto-endorsed" toast because the rule `auto-approve-transport` matches.
2. **Click the bell** at the top right. You'll see notifications for prior auto-endorsements and status updates on past claims.
3. **Try a blocked path.** Pick category "Client Entertainment", fill the amount but leave the business justification empty and submit. The API returns `422` with the matched-rule message. Fill the justification, re-submit, and the claim moves to Pending.
4. **Sign out, sign in as Approving Officer** (demo.manager@claimflow.com). The queue is pre-populated with Sales department claims. Open any pending one. The "Where to look" panel shows which field triggered review (for example, "Amount above S$500 ceiling, verify business justification").
5. **Sign in as Finance Admin** (demo.finance@claimflow.com). Switch between the Dashboard, Payment Queue and Audit Trail tabs. Select a few endorsed claims and mark them paid. The submitter gets a "Reimbursed" notification on their next poll.
6. **Forgot password.** On sign-in, type any email and click "Forgot password?". A new temporary password is generated, displayed under the button and pre-filled. Click Sign in.
7. **Oversized upload.** From the Demo fixtures panel, try `oversized.pdf` (~11 MB). The backend rejects it with the 10 MB upload limit error.

## What's in the policy engine

Single source of truth: `backend/api/config/policies.json` (mirrored to `frontend/src/data/policies.json` for the live preflight panel on the submitter form).

| Rule | Outcome |
|---|---|
| `block-disallowed-category` | Claims for Club Subscription / non-statutory Medical / Family Benefit / Motor Car (non-commercial) blocked per IRAS Reg. 26/27. |
| `block-future-date` | Future-dated claims blocked. |
| `block-missing-receipt-over-threshold` | Claims above S$50 without a receipt blocked. |
| `block-entertainment-missing-context` / `-client` | Client Entertainment must name client + give business justification (IRAS requirement). |
| `block-training-missing-justification` | Training claims must describe how the course supports the role. |
| `route-late-night-transport` | Transport > S$25 with travel window "Late night (22-06)" routed for review. |
| `auto-approve-small-meal` | Meal ≤ S$30 with receipt → Endorsed immediately. |
| `auto-approve-transport` | Transport ≤ S$50 with receipt → Endorsed immediately. |
| `route-meal-missing-attendees-context` | Meal > S$50 without an attendee note routed for review. |
| `route-large-amount` | Anything > S$500 routed for human approval. |

Auto-approve is suppressed when the receipt's OCR source is `unavailable`. In that case the manager checks the manually-entered fields against the receipt image.

## Where to find things

- **API reference** — `http://localhost:4000/api/docs` (Swagger UI, while the API is running)
- **Database schema** — `backend/api/prisma/schema.prisma`
- **Per-category form schema** — `frontend/src/data/categoryFields.json`
- **Policy rules** — `backend/api/config/policies.json` (single source of truth)
- **Compliance docs** — `docs/compliance/*.md` (PDPA, GST/IRAS, retention, approval policy)
- **Test receipt fixtures** — `frontend/public/test-receipts/`

## Layout

```
backend/api/              REST API — TypeScript, Express, Prisma
  prisma/                 Schema + seed
  config/                 policies.json (single source for rule engine)
  src/controllers/        Endpoint handlers (auth, claim, workflow, notification, user)
  src/services/           Policy engine, receipt parser (Azure OCR), blob storage
backend/auth-gateway/     Auth proxy — JavaScript, Express
docs/                     Project documentation
frontend/                 Web client — React + Vite + Tailwind + shadcn/ui
  public/test-receipts/   PDF / PNG / JPEG fixtures to demo OCR
  scripts/                Test-receipt generator (PDFKit)
  src/components/         App shell, sidebar, notification bell, dynamic category fields, modals
  src/data/               categoryFields.json + policies.json (mirror)
  src/hooks/              useClaims (with polling), useNotifications, useTheme
  src/lib/                policy.js (frontend mirror of the engine), utils
  src/pages/              signin, employee, approving, finance, compliance, policies, privacy
```

## Troubleshooting

- **`P1002: timed out trying to acquire a postgres advisory lock`** when running `prisma migrate dev` against Azure Postgres Flexible Server. Use `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 npx prisma db push --accept-data-loss` for schema changes during development.
- **Frontend can reach the API but receipt uploads return mock data.** Check `frontend/.env.local`. If `VITE_MOCK_API=true`, the entire API layer is bypassed by the local-storage mock. Set it to `false` (or delete the file) and reload.
- **`EADDRINUSE` on port 4000.** A previous `npm run dev` left an orphaned ts-node. Run `netstat -ano | grep :4000` to find the PID and `taskkill /PID <pid> /F` (Windows) or `kill -9 <pid>` (Mac/Linux), then restart.
- **OCR returns `source: "unavailable"`** on a receipt that should work. Azure Document Intelligence rejects very small images (<50×50px) and password-protected PDFs. Try a phone photo of the original; manual entry always remains available.
