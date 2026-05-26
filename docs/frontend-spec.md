# ClaimFlow Frontend — Design Spec

**Status:** Proposed (2026-05-26)
**Scope:** Full frontend redesign of `frontend/login-dashboard/` from Bootstrap 5.3 to a shadcn/ui-based design system. Adds a new Finance Admin Insights dashboard.
**Owner:** Daniel (executing), Ang Bi Jun (lead frontend reviewer).
**Branch:** `feat/shadcn-redesign`.

---

## 1. Why

Two pressures converged:

1. **Insights gap.** Finance Admin currently has only Payment Queue and Audit Trail tabs. When claims grow past a few dozen per month, there is no way to see spend by department, policy effectiveness, or category mix without exporting CSV and pivoting externally. SME finance leads need this at a glance.
2. **Style debt.** The current frontend is Bootstrap 5.3 plus ~63 KB of hand-rolled Apple-inspired CSS in `index.css`. The aesthetic is fine but the codebase has a single growing stylesheet, duplicated colour tokens, and no component primitives. New pages (compliance, policies, privacy) have already started diverging.

The fix is a single coherent design system. shadcn/ui is the chosen target: copy-paste components on top of Tailwind + Radix, no runtime dependency on a framework lib, and standard Recharts integration for the dashboard.

## 2. Goals & non-goals

**Goals**
- All 7 pages share one design system and look consistent end-to-end.
- Finance Admin gets a dedicated Insights view anchored on claim volume + spend, category & department breakdown, and policy effectiveness.
- Light and dark mode preserved (already supported via `usetheme.js`).
- Apple-blue brand colour (`#0071e3`) preserved as the shadcn `--primary`.
- Mobile-responsive (current app is desktop-first; redesign brings sidebar-into-Sheet pattern for small screens).

**Non-goals**
- No new backend API endpoints. All insights are computed client-side from data already returned by `useClaims`.
- No test suite introduction. The project has no tests today; adding Vitest + RTL is a separate decision.
- No PWA / offline.
- No HEIC inline preview (browser limitation, unrelated concern).

## 3. Inputs that drove the design

- Project audience: Singapore SMEs (SGD, GST-aware, IRAS-compliant policies).
- Existing role surfaces: Employee, Approving Officer (Manager), Finance Admin.
- Existing client-side policy rules in `src/data/policies.json` (3 actions: `block`, `auto-approve`, `route-to-human`). The Insights view uses these to compute "policy effectiveness".
- Constraint: view must be consistent at all times → rules out incremental page-by-page merges to `develop`. Migration happens on one feature branch and merges as one PR with reviewable chunks.

## 4. Stack changes

**Add**
- `tailwindcss` + `postcss` + `autoprefixer`
- `class-variance-authority`, `clsx`, `tailwind-merge` (CVA pattern, the standard shadcn helper trio)
- `@radix-ui/react-{slot,dialog,dropdown-menu,select,tabs,tooltip,popover,checkbox,label,avatar,separator}` (pulled in by individual shadcn components)
- `lucide-react` (icon system; replaces FontAwesome)
- `recharts` (charts)
- `date-fns` (week/month bucketing for the trend chart)
- `sonner` (toast layer; replaces the existing `toastcontext.jsx` internals, keeps `addToast({...})` API surface)

**Remove**
- `aos` (animate-on-scroll; rarely needed once shadcn provides motion via Radix transitions)
- Bootstrap 5.3 CDN link in `index.html`
- FontAwesome CDN link in `index.html`
- The 63 KB `src/index.css` (replaced by a ~2 KB `globals.css` holding Tailwind directives + CSS variables)

**Keep**
- React 18, Vite 5, React Router 6
- The Inter font (already loaded; shadcn defaults to it)
- All hooks (`useclaims`, `usetheme`, `authcontext`, `toastcontext`) — API surface preserved, internals re-skinned where needed.
- The backend integration (`utils/api.js`).

## 5. Theme & tokens

Tailwind config holds the theme. CSS variables on `:root` and `.dark` follow the standard shadcn pattern (HSL triples):

```
--background, --foreground
--card, --card-foreground
--popover, --popover-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
--border, --input, --ring
--radius: 0.5rem
```

`--primary` is set to `210 100% 45%` (HSL of `#0071e3`) so the brand colour survives the migration.

`usetheme.js` is updated to toggle `.dark` on `<html>` instead of `data-theme` / `data-bs-theme`. The existing storage key (`claimflow-theme`) and prefers-color-scheme detection stay.

## 6. Component primitives

All under `src/components/ui/`. Each is a verbatim shadcn copy-paste (with the Tailwind classes baked in), no framework runtime dependency:

```
button.jsx        card.jsx           badge.jsx
input.jsx         label.jsx          textarea.jsx
select.jsx        checkbox.jsx       table.jsx
tabs.jsx          dialog.jsx         sheet.jsx
dropdown-menu.jsx avatar.jsx         separator.jsx
skeleton.jsx      sonner.jsx         tooltip.jsx
popover.jsx       sidebar.jsx        chart.jsx
```

The `chart.jsx` wrapper is shadcn's Recharts-themed wrapper — gives consistent colours, tooltips, and legend across all charts.

## 7. Layout — AppShell

Authenticated routes wrap in an `AppShell` (replaces `components/layout.jsx`):

```
┌─ AppShell ─────────────────────────────────────────────────┐
│  Sidebar (Sheet on <md)            Main                    │
│  ┌──────────────┐                  ┌──────────────────┐   │
│  │ ◇ ClaimFlow  │                  │ PageHeader       │   │
│  │              │                  │ title + actions  │   │
│  │ <role nav>   │                  │                  │   │
│  │              │                  │ <Outlet />       │   │
│  │ ───────────  │                  │                  │   │
│  │ 👤 Daniel    │                  │                  │   │
│  │ ⚙ Theme/Out  │                  │                  │   │
│  └──────────────┘                  └──────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Role-aware sidebar nav**
- Employee: My Claims, Submit New
- Manager: Approval Queue, History
- Finance Admin: **Dashboard** (new), Payment Queue, Audit Trail

**Public layout** (signin, compliance, policies, privacy) skips the shell — uses a centred card layout on a muted background.

## 8. Insights page — Finance Admin → Dashboard

The new view. Vertical sections:

### 8.1 Header row
```
Insights                                          [This month ▼]
```
Date range options: This month, Last 30 days, Last quarter, Year to date, Custom.

### 8.2 Stat tile row (4 cards)
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Total      │ │ Disbursed  │ │ Awaiting   │ │ To pay     │
│ claims     │ │            │ │ endorsement│ │            │
│ 142        │ │ S$38,420   │ │ 17         │ │ 24         │
│ ↑ 12% MoM  │ │ ↑ 8% MoM   │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

MoM deltas computed from same range one period back.

### 8.3 Two-up row — Policy effectiveness × Category mix

**Policy effectiveness** (left, horizontal stacked bar + top breach reason)

```
Auto-approved   ▆▆▆▆▆▆▆▆▆▆▆▆▆▆  62%   88 claims
Routed to human ▆▆▆▆▆▆          24%   34 claims
Blocked         ▆▆▆▆            14%   20 claims

Top block reason: Missing receipt > S$50  (11 claims)
```

Sourced by running `policies.json` rules against each loaded claim — pure client-side, no API.

**Category mix** (right, donut + legend)

Categories from existing claim data: Meal, Transport, Office Supplies, Travel, Medical, Training, Other.

### 8.4 Department spend (horizontal bar, top 8)

```
Engineering    ████████████████████  S$12,840
Sales          ██████████████        S$8,920
Operations     ████████              S$5,210
Marketing      ██████                S$3,640
…
```

### 8.5 Submission trend (12-week area chart)

```
        ╱╲       ╱╲
───╱╲──╱  ╲────╱  ╲───╱╲──
W1   W4   W7   W10
```

Two series: claims submitted, claims disbursed. Recharts `<AreaChart>`, stacked false, light fill.

## 9. Data flow

No new API calls. New hooks under `src/hooks/`, all pure derivations of `useClaims` data:

```
useInsights(claims, range)        // totals, MoM deltas, pending counts
usePolicyBreakdown(claims, rules) // runs policies.json against each claim
useCategoryMix(claims)            // groupBy category, sum amount
useDepartmentSpend(claims, n=8)   // groupBy department, top N
useSubmissionTrend(claims, weeks) // bucket by ISO week
```

All memoized with `useMemo`. Single source of truth remains the existing claims API.

## 10. Page migrations

| Page | Notable changes |
|---|---|
| `signin.jsx` | Two-column: brand/illustration left, Card with Input/Label/Button right. Quick-login buttons become `Button variant="outline"` chips. |
| `employee.jsx` | Claim form uses Card + Input + Select + Textarea. Receipt upload zone uses `Sheet` for "edit extracted fields" step. Claim list as shadcn Table with Badge status pills. |
| `approving.jsx` | Approval queue as Table with row actions (DropdownMenu). Rejection modal → `Dialog` with Textarea + reason chips. |
| `finance.jsx` | New left-nav inside the page: Dashboard / Payment Queue / Audit. Existing tables migrated to shadcn Table. CSV export button as `Button variant="outline"` with `Download` icon from lucide. |
| `compliance.jsx` | Marketing-style sections inside Card layouts. |
| `policies.jsx` | Same — Card per rule, Badge for action (`auto-approve`/`block`/`route-to-human`). |
| `privacy.jsx` | Long-form text in a max-width container with anchored ToC. |

## 11. Icon migration

Every FontAwesome `<i className="fa-...">` becomes a lucide-react component. Mapping kept simple:

```
fa-magnifying-glass → Search
fa-filter           → Filter
fa-wallet           → Wallet
fa-file-shield      → FileShield
fa-download         → Download
fa-arrow-right-from-bracket → LogOut
fa-sun / fa-moon    → Sun / Moon
fa-circle-check     → CheckCircle2
fa-triangle-exclamation → AlertTriangle
fa-building-columns → Landmark
```

(Full mapping table built during implementation.)

## 12. Error handling, loading, empty states

- **Loading:** `Skeleton` components in cards and table rows. No more global spinner.
- **Errors:** Inline `Alert` (variant=destructive) at the top of the affected view; toast via Sonner for transient failures.
- **Empty states:** Card with a lucide icon, headline, supporting text, primary CTA. Replaces `components/emptystate.jsx` with one consistent component under `ui/`.
- **Toasts:** `addToast({variant, title, message})` API preserved at the context level; the implementation under the hood becomes Sonner. Existing callers (`useclaims`, page handlers) don't change.

## 13. Migration order — commits on `feat/shadcn-redesign`

Each commit is independently buildable. Final merge is one PR; the chunked history makes review tractable.

1. scaffold tailwind + postcss + shadcn deps; add `globals.css`, `tailwind.config.js`, `components.json`
2. design tokens — HSL CSS variables, dark-mode `.dark` class, `usetheme.js` update
3. shadcn primitives — copy in `ui/*` components
4. AppShell — Sidebar, PageHeader, role-aware nav, theme/logout dropdown
5. signin migration
6. employee page migration
7. approving page migration
8. finance page migration (Payment Queue + Audit, no Dashboard yet)
9. Insights page — hooks + Dashboard view
10. public pages migration (compliance, policies, privacy)
11. delete `index.css`, Bootstrap CDN, FontAwesome CDN, AOS

Each commit subject is short and lowercase, matching the existing log style on this repo (no AI tells).

## 14. Risk register

| Risk | Mitigation |
|---|---|
| Bundle size jumps from Radix + Recharts | Tree-shaking via Vite + dynamic import for the chart bundle on the Insights page only. Target: <500 KB gzipped JS. |
| `usetheme.js` toggle change breaks existing dark-mode preference | Keep the same `localStorage` key (`claimflow-theme`) so users don't get reset. |
| Sonner toast API drift from existing `toastcontext` | Wrap Sonner inside the existing context provider; preserve `addToast({variant, title, message})` signature exactly. |
| Bi Jun (frontend lead) is mid-flight on another page | Confirm before merging; respect any in-progress work on `develop`. |
| Insights computation is heavy on large claim sets | All client-side hooks memoized; date-range filter applied before any groupBy. If lists exceed a few thousand claims, revisit with backend aggregation. |

## 15. Out of this spec

- New API endpoints for analytics aggregation. (Future, if claim volume warrants it.)
- Tests. (Project has none; introducing a test framework is a separate decision.)
- Email/Slack alerts on stuck claims.
- A "Settings" page (per-user preferences, notification toggles).
- Multi-currency. SGD only for now.

## 16. Done means

- All 7 pages render with the new design in light and dark mode.
- Finance Admin Dashboard renders all four insight sections from seeded data without errors.
- `index.css`, Bootstrap, FontAwesome, and AOS are gone from the bundle.
- `npm run build` produces a working production bundle.
- One PR `feat/shadcn-redesign → develop` with the chunked commit history.

## 17. Implementation plan

The implementation plan (file-by-file work breakdown) is generated separately by the writing-plans skill once this spec is approved.
