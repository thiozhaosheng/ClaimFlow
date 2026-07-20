# ClaimFlow

Role-based expense claim portal for Singapore SMEs.

Handles claim submission with receipt OCR (Azure AI Document Intelligence), IRAS/GST policy checks, manager review, and finance payout, across three roles: employee, approving officer, and finance admin.

## Repository Layout

Monorepo architecture:

* [`frontend/`](frontend/) — React 19 + Vite frontend. Contains the UI, context providers, and mock data fallback.
* [`backend/api/`](backend/api/) — Express API + Prisma/Postgres core business logic, policies, and OCR integrations.
* [`backend/auth-gateway/`](backend/auth-gateway/) — Express rate-limiting and reverse proxy to the backend API.
* [`docs/`](docs/) — compliance notes (GST/IRAS, PDPA, retention policy).

## Quick Start

### 1. Frontend (Mock API mode)

If you don't have the backend or Azure credentials configured, you can run the frontend in mock mode:

```bash
git clone https://github.com/thiozhaosheng/ClaimFlow.git
cd ClaimFlow/frontend
npm install
npm run dev      # Runs on http://localhost:5173
```
*Note: It will use a mock, localStorage-backed dataset if it can't connect to a real API.*

### 2. Full Stack (Frontend + Backend + Gateway)

You will need an Azure AI Document Intelligence endpoint and a PostgreSQL database. Set the following variables in `backend/api/.env`:

```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET=your_secret_key
AZURE_DOC_INTEL_ENDPOINT=your_endpoint
AZURE_DOC_INTEL_KEY=your_key
```

Run each service in separate terminal windows:
```bash
# 1. Backend API
cd backend/api
npm install
npm run dev      # Runs on http://localhost:3000

# 2. Auth Gateway
cd backend/auth-gateway
npm install
npm run dev      # Runs on http://localhost:4000

# 3. Frontend
cd frontend
npm install
npm run dev      # Runs on http://localhost:5173
```

## Testing Strategy

The project implements a comprehensive "Vertical Slice" testing strategy to ensure reliability:
- **Unit Testing**: Tests core business logic (`policyEngine.test.ts`) and OCR extraction (`receiptParser.test.ts`) in `backend/api` using Jest and Mocks.
- **Integration Testing**: Uses `supertest` to test API routes and responses without spinning up a live server (`claim.routes.test.ts`).
- **End-to-End Testing**: Uses **Playwright** (`frontend/e2e/claim.spec.ts`) to automate a headless Chromium browser and verify the full Employee Claim Submission flow.
- **Performance Testing**: A **k6** script (`backend/api/performance.js`) load tests the backend API using 20 Virtual Users, ensuring a 95th percentile latency threshold of under 500ms.
- **Continuous Integration (CI)**: A GitHub Actions workflow (`.github/workflows/node-ci.yml`) runs the test pipeline automatically on every push and PR to the `main` branch.

## Demo Logins

| Persona | Role | Email | Password |
|---|---|---|---|
| Sarah Tan | Employee | `demo.employee@claimflow.com` | `claimflow-demo` |
| Marcus Lim | Approving Officer | `demo.manager@claimflow.com` | `claimflow-demo` |
| Dan Yeo | Finance Admin | `demo.finance@claimflow.com` | `claimflow-demo` |

## Walkthrough

1. **Submit and auto-approve (Sarah Tan).** New claim → Transport → use the "simulate Grab receipt scan" option in the upload step. It mocks an OCR pass and fills in a S$23.10 fare. Since it's a transport claim under S$50 with a receipt attached, it auto-approves without going to a manager.
2. **Policy block (Sarah Tan).** Submit a Client Entertainment claim without filling in the business justification field — the policy engine blocks the submission and names the rule (IRAS requires justification on record for entertainment claims).
3. **Review (Marcus Lim).** Approvals Queue shows pending claims from Marcus's own department. Endorse or reject one.
4. **Payout (Dan Yeo).** Reports page has the treasury runway simulator; Payouts Queue is where endorsed claims actually get disbursed via GIRO/PayNow over the FAST clearing API.

## Troubleshooting

- **`EADDRINUSE` on 3000/4000/5173:** A previous dev server didn't shut down cleanly. `lsof -i :3000`, then `kill -9 <PID>`.
- **Mock data looks stuck:** Clear local storage or hit "Log Out" to force a re-seed.
