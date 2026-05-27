# ClaimFlow Frontend — Design Spec

**Status:** In progress on `develop` (updated 2026-05-27).
**Scope:** Migrate `frontend/` from Bootstrap 5.3 to Tailwind CSS while keeping the existing custom component layer and page structure. No new pages, no design system swap.

---

## 1. Background

The frontend has carried a Bootstrap 5.3 CDN link since the first commit on `develop`. Most of the visual styling, however, lives in a single hand-rolled `src/index.css` (≈3000 lines of Apple-inspired component classes). Bootstrap only contributes:

- Utility classes used inline in JSX (`d-flex`, `justify-content-between`, `align-items-center`, `mb-3`, `row`/`col-*`, `text-end`, and so on).
- Base styling for form elements (`.form-control`, `.form-select`, `.form-check-input`) and buttons (`.btn`, `.btn-primary`).
- A dark-mode toggle hooked into `data-bs-theme` on `<html>`.

This has two problems:

1. **Two redundant systems.** The custom CSS already overrides most Bootstrap defaults, so the framework is mostly along for the ride. The bundle pays for it and the markup is inconsistent (some places use Bootstrap utilities, others use custom classes for the same intent).
2. **Hard to extend.** Adding new pages means choosing between writing more custom CSS in the growing `index.css` or pulling in more Bootstrap utility classes that need overriding anyway.

Tailwind solves both: utilities are generated on demand, mapped against the existing design tokens, and the custom component layer in `index.css` survives intact. No design redo required.

## 2. Goals & non-goals

**Goals**
- Remove the Bootstrap CSS + JS CDN links from `index.html`.
- Replace every Bootstrap utility class in JSX with the Tailwind equivalent.
- Keep the custom component classes (`.auth-shell`, `.workspace-card`, `.welcome-strip`, `.data-table`, `.claim-mini-card`, `.badge-custom`, etc.) — they are project-owned and unchanged.
- Switch the dark-mode trigger from `data-bs-theme` / `data-theme` to Tailwind's `.dark` class strategy.
- Keep the existing design tokens (Apple-inspired CSS variables) — Tailwind config maps them.

**Non-goals**
- No visual redesign. Pages look identical pre/post migration.
- No new pages, no new analytics or dashboard views.
- No component library introduction (no shadcn, no Radix, no Material).
- No icon migration (FontAwesome stays).
- No tests added (the project has none today; that decision is separate).

## 3. Stack changes

**Add**
- `tailwindcss` v3 (dev dependency).
- `postcss`, `autoprefixer` (Tailwind PostCSS pipeline).
- `tailwind.config.js` mapping design tokens.
- `postcss.config.js` registering the Tailwind + autoprefixer plugins.

**Remove**
- Bootstrap 5.3 CSS link in `index.html`.
- Bootstrap 5.3 JS bundle script in `index.html`.

**Keep**
- React 18, Vite 5, React Router 6.
- `aos` (animate-on-scroll on the sign-in page).
- FontAwesome 6.4 CDN for icons.
- The Inter font CDN.
- All hooks (`useclaims`, `usetheme`, `authcontext`, `toastcontext`) — API surface unchanged.
- The 3000-line `src/index.css` — minus the `[data-theme="dark"]` selector swap to `.dark`, and minus the Bootstrap utility-class overrides that are no longer needed.

## 4. Theme tokens

The existing CSS variables in `:root` and `.dark` (in `src/index.css`) stay as the source of truth. Tailwind's config maps them so utilities like `bg-card`, `text-text-primary`, `border-accent-subtle` resolve to those variables:

```
--bg-app, --bg-card, --bg-subtle, --bg-muted
--text-primary, --text-secondary, --text-tertiary
--border-subtle, --border-default, --border-strong
--accent, --accent-hover, --accent-subtle, --accent-ring
--success / -bg / -text
--warning / -bg / -text
--danger / -bg / -text
--info / -bg / -text
--radius-sm, --radius-md, --radius-lg, --radius-xl
--shadow-xs, --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
```

Dark mode toggles on `<html class="dark">`, set by `usetheme.js`. The `claimflow-theme` localStorage key is preserved so existing user preferences carry over.

## 5. Class translation table

The migration is mechanical. Each Bootstrap class in JSX is replaced with the Tailwind equivalent. Classes that share a name (e.g. `mb-3`, `text-center`, `p-4`) need no change — Tailwind generates the same utility.

| Bootstrap | Tailwind |
|---|---|
| `d-flex` | `flex` |
| `d-none` | `hidden` |
| `d-block` | `block` |
| `d-inline-block` | `inline-block` |
| `flex-column` | `flex-col` |
| `justify-content-between` | `justify-between` |
| `justify-content-center` | `justify-center` |
| `align-items-center` | `items-center` |
| `align-items-start` | `items-start` |
| `flex-grow-1` | `flex-1` |
| `w-100` | `w-full` |
| `h-100` | `h-full` |
| `text-end` | `text-right` |
| `text-nowrap` | `whitespace-nowrap` |
| `me-N` | `mr-N` |
| `ms-N` | `ml-N` |
| `ps-N` | `pl-N` |
| `pe-N` | `pr-N` |
| `vstack gap-N` | `flex flex-col gap-N` |
| `row` + `col-X-N` | `grid grid-cols-12 md:col-span-N` |
| `border-end-0` | `border-r-0` |
| `border-start-0` | `border-l-0` |
| `border-top` | `border-t border-border-subtle` |
| `border-bottom` | `border-b border-border-subtle` |
| `rounded-3` | `rounded-ds-md` |
| `shadow-sm` | `shadow-ds-sm` |
| `text-uppercase` | `uppercase` |
| `fw-semibold` | `font-semibold` |
| `fw-normal` | `font-normal` |
| `fs-5` | `text-lg` |
| `small` | `text-xs` |
| `text-decoration-none` | `no-underline` |

## 6. Standalone form & button rules

Bootstrap previously supplied the base for `<input>` / `<select>` / `<button>` styling, with the project CSS layering tokens on top. Without Bootstrap, the project rules become primary. The following classes in `src/index.css` were rewritten to be standalone (no inherited Bootstrap base):

- `.btn`, `.btn-primary` — full sizing, padding, hover, disabled.
- `.form-control`, `.form-select` — block, full width, border, background, focus ring, placeholder, select arrow.
- `.form-check-input` — checkbox + radio appearance, checked state, focus ring.
- `.input-group`, `.input-group-text` — joined input/affix sizing and borders.
- `.spinner-border` — display, rotation animation.
- `.container-fluid` — full-width wrapper.

These keep the existing class names so the JSX call sites don't need to change for form elements.

## 7. Per-page migration notes

| File | Migration |
|---|---|
| `pages/signin.jsx` | No JSX changes — already uses only custom project classes. |
| `pages/employee.jsx` | Bootstrap grid (`row`/`col-md-*`) → Tailwind `grid` with `md:col-span-*`. Alert blocks (`alert alert-warning`, `alert alert-danger`) → token-driven Tailwind utility chains (`bg-warning-bg text-warning-text border border-warning/20`). All `d-flex` / `me-*` / `text-end` / `small` swapped. |
| `pages/approving.jsx` | `vstack` → `flex flex-col`. `flex-grow-1` → `flex-1`. Bootstrap `nav nav-item nav-link` chrome dropped (sub-tabs already use the custom `.sub-tab-link`). `table-responsive` → `overflow-x-auto`. |
| `pages/finance.jsx` | Largest migration: action bar, two data tables, segmented control, audit role badges. `bg-light` → `bg-subtle`. Role badge variants `bg-primary-subtle` / `bg-info-subtle` → `bg-accent-subtle` / `bg-info-bg` with matching text + border tokens. |
| `pages/compliance.jsx` | Bootstrap `card` / `card-body` chrome → plain Tailwind card composition (`bg-card border border-border-subtle rounded-ds-lg shadow-ds-sm p-4`). Breadcrumb rewritten as a simple `<ol>` with `/` separators. |
| `pages/policies.jsx` | Same card pattern as Compliance. Outcome badge colours (`bg-success`/`bg-warning`/`bg-danger`) keep the Bootstrap class names but resolve to Tailwind utilities from the token config. Update the source-of-truth path comment from `frontend/login-dashboard/...` to `frontend/...`. |
| `pages/privacy.jsx` | Bootstrap heading sizing (`h4`, `h5`) replaced with Tailwind `text-xl font-semibold`. `breadcrumb` rewritten. `list-disc pl-6` added explicitly (Tailwind preflight resets list styling). |
| `components/layout.jsx` | Drop `py-4` (Bootstrap utility); the project's `main.container-fluid` rule already supplies padding. |
| `components/header.jsx`, `welcomestrip.jsx`, `emptystate.jsx`, `loginillustration.jsx`, `logo.jsx`, `protectedroute.jsx`, `claimdetailmodal.jsx`, `rejectionmodal.jsx` | No JSX changes — already pure custom classes. |

## 8. Folder restructure (related)

In the same change set, the React app moved up one level:

- `frontend/login-dashboard/*` → `frontend/*`
- `frontend/ui-scaffold/` deleted (was an unused scaffold duplicate).
- `server/` (root, untracked) cleaned up.

This is independent of the Tailwind migration but bundled into the same branch because both touch the frontend tree.

## 9. Verification

- `npm run dev` from `frontend/` starts on `http://localhost:3000`.
- Each page renders without Bootstrap loaded.
- Light/dark mode toggles via the header button; preference persists across reloads.
- No console errors from missing Bootstrap classes.
- `npm run build` produces a working production bundle.

## 10. Out of this spec

- New pages or dashboards (e.g. Finance insights analytics).
- Component library adoption (shadcn, Radix, Material).
- Icon migration (FontAwesome → lucide or similar).
- Test framework introduction.
- Multi-currency or i18n.

## 11. Risk register

| Risk | Mitigation |
|---|---|
| Tailwind preflight resets browser defaults that Bootstrap previously supplied (e.g. list bullets, table borders). | Audit each page after migration; add explicit Tailwind utilities (`list-disc pl-6`, `border-collapse`) where the look depended on the reset. |
| Dark-mode selector change breaks an in-flight branch that still uses `data-theme`. | The `usetheme.js` hook continues to set `data-theme` alongside `.dark` for backward compatibility; CSS rules in `index.css` updated in lockstep. |
| Class-name collisions where Bootstrap and Tailwind share a name but differ in semantics (e.g. `align-middle`). | The shared names that matter (`mb-N`, `mt-N`, `p-N`, `text-center`) have identical semantics. Aliased ones (`align-middle` for vertical-align) resolve the same way in Tailwind. |
| Stylesheet bloat from generated Tailwind utilities. | Content globs in `tailwind.config.js` are scoped to `./index.html` and `./src/**/*.{js,jsx}`; production builds purge unused utilities. |
