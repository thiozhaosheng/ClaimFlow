# ClaimFlow

Role-based expense claim portal for Singapore SMEs. Capstone project for NP-CET DFS IP Run 2 (Ngee Ann Polytechnic — Continuing Education & Training, Digital Financial Services Integration Project).

Handles claim submission with receipt OCR, IRAS/GST policy checks, manager review, and finance payout, across three roles: employee, approving officer, finance admin.

## Repository layout

Monorepo, three parts:

* [`web/`](web/) — Next.js 16 + React 19 + TypeScript frontend.
* [`backend/`](backend/) — Express API + Prisma/Postgres, plus Azure Document Intelligence for OCR.
* [`docs/`](docs/) — compliance notes (GST/IRAS, PDPA, retention policy).

## Quick start

The root `package.json` just proxies into `web/`:

```bash
git clone https://github.com/thiozhaosheng/ClaimFlow.git
cd ClaimFlow

npm install --prefix web
npm run dev      # http://localhost:3000
npm run build
```

No backend required to run the frontend — it falls back to a mock, localStorage-backed dataset when there's no logged-in session against a real API.

## How the data layer is set up

`claims.repo.ts` defines one `ClaimsRepository` interface with three implementations: a mock one backed by `localStorage`, a real one that calls the Express API, and a `hybridClaimsRepository` (the default export) that picks between them per call based on whether a login token is present. Everything in the UI depends on the interface, not on which implementation is active.

The IRAS policy engine (`web/src/core/domain/policy/engine.ts`) reads rules from `policies.json` and compiles them into closures once at import time, rather than re-parsing the JSON on every claim evaluation.

Holding Option/Alt blurs and dims sidebar links the current role can't access (`useHotkeyHints` in `web/src/hooks/use-hotkey-hints.ts`) — a visual cue for the RBAC boundary. The actual enforcement for approving officers is a client-side filter on the Approvals page (`c.department === user.department`); the backend's `/claims` list endpoint itself does not filter by department, so don't rely on it as a security boundary — it's a demo-scoped detail, not the finished access-control story.

## Demo logins

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

- **`EADDRINUSE` on 3000/4000:** a previous dev server didn't shut down cleanly. `lsof -i :3000` (or `:4000`), then `kill -9 <PID>`.
- **Stale Next.js build cache:** `rm -rf web/.next && npm run build`.
- **Mock data looks stuck:** clear local storage or hit "Log Out" to force a re-seed.
