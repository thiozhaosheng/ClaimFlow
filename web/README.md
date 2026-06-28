# ClaimFlow — Web (Next.js rebuild)

Production-grade frontend for the **Claims & Reimbursement** platform for
Singapore SMEs. Receipt → OCR → policy auto-approval → manager/HR review →
GIRO/PayNow payout, with a full audit trail.

This app is a production-grade React/Next.js frontend using Clean Architecture, strict TypeScript typing, and responsive tailwind styles.

---

## Stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Framework      | Next.js 16 (App Router)                  |
| UI runtime     | React 19                                 |
| Language       | TypeScript (strict)                      |
| Styling        | Tailwind CSS v4 (`@theme` design tokens) |
| Server state   | TanStack Query                           |
| Theming        | next-themes (class-based dark mode)      |
| Primitives     | Radix UI + class-variance-authority      |
| Charts         | Recharts                                 |
| Unit tests     | Vitest + Testing Library                 |
| Lint           | ESLint (eslint-config-next)              |

---

## Prerequisites

- **Node.js ≥ 20.11** (LTS recommended) and npm ≥ 10.
- No backend required to run the UI — it is served from a mock repository
  (`src/data/repositories/claims.repo.ts`) behind a typed interface.

## Getting started

```bash
cd web
npm install        # first time only
npm run dev        # http://localhost:3000
```

## Scripts

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Start the dev server (Turbopack) on :3000   |
| `npm run build`      | Production build + type-check               |
| `npm run start`      | Serve the production build                   |
| `npm run lint`       | ESLint                                       |
| `npm test`           | Run the Vitest suite once                   |
| `npm run test:watch` | Vitest in watch mode                        |

> **Build tip:** stop the dev server before running `npm run build`. Running a
> build while `next dev` is live can leave a half-written `.next/` and produce
> a "directory not empty" / lock error. If a build ever misbehaves:
> `rm -rf .next && npm run build`.

---

## Architecture (Clean Architecture, feature-first)

```
src/
  app/                      # Next App Router (routing + composition only)
    (app)/                  # authenticated shell route group
      layout.tsx            #   sidebar + topbar
      page.tsx              #   dashboard
      claims/               #   claims list + [id] detail
      approvals/ payouts/ reports/ audit/   # role workspaces (roadmap)
    layout.tsx              # root: fonts, providers, <html>
    globals.css             # design tokens (single source of color/spacing)
  core/                     # DOMAIN — framework-free, pure, unit-tested
    domain/
      types.ts              #   Claim, ClaimStatus, PolicyResult, …
      money.ts dates.ts     #   SG formatting helpers
      policy/engine.ts      #   IRAS rule engine (data-driven, ported)
      claim-progress.ts     #   SG payout timeline + requirements checklist
      categories.ts         #   category fields/forms + icon mapping
  data/                     # DATA — sources behind interfaces
    policies.json           #   policy rules (shared with legacy app)
    category-fields.json    #   per-category form definitions
    mock/                   #   deterministic demo seed data
    repositories/           #   ClaimsRepository interface + mock impl
  components/
    ui/                     # design-system primitives (Card, Button, …)
    shell/                  # app chrome (sidebar, topbar, theme toggle)
  features/                 # feature modules (UI + query hooks)
    claims/  dashboard/
  lib/                      # cn(), providers
```

**Dependency rule:** `app` → `features` → `components`/`core`/`data`.
`core` depends on nothing framework-specific, so the business rules are
portable and fast to test. Swapping the mock data for the real API is a single
file change (`claims.repo.ts`) — every consumer depends on the
`ClaimsRepository` interface, not the implementation.

## Design system

All color, radius, shadow, and spacing live as CSS variables in
`globals.css` and are exposed to Tailwind via `@theme` (e.g. `bg-card`,
`text-fg-secondary`, `shadow-card`). Components never hardcode hex values.
Color is **semantic only** — status (pending/endorsed/paid/rejected) and
document state (done/missing/blocked) — not decoration. Dark mode is
class-based (`.dark` on `<html>`).

## Testing

```bash
npm test
```

- `core/domain/policy/engine.test.ts` — IRAS rule outcomes
- `core/domain/claim-progress.test.ts` — stages + requirements derivation

## Quality gates (all green)

```
npm run lint   # 0 problems
npm run build  # type-checks + compiles clean
npm test       # passing
```
