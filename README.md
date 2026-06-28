# ClaimFlow

Role-based expense claim portal for Singapore SMEs. Capstone project for the **NP-CET DFS IP Run 2** (Ngee Ann Polytechnic - Continuing Education & Training, Digital Financial Services Integration Project).

ClaimFlow demonstrates enterprise-grade automated claims management, dynamic IRAS/GST policy enforcement, role-aware dashboard interfaces, and premium Apple-style liquid glass design paradigms.

---

## 📂 Repository Directory Layout

This repository is organized as a monorepo containing the flagship web client, database mockups, and backend APIs:

* **[`web/`](web/)** — **Flagship Next.js 16 + React 19 + TypeScript Application.** Built using Clean Architecture separation of concerns, Vitest unit testing, and hardware-accelerated Framer Motion interactive layouts.
* **[`backend/`](backend/)** — **Express.js API + Prisma ORM.** Backend services managing database storage, authentication gateways, and Azure Document Intelligence OCR integrations.
* **[`docs/`](docs/)** — **Project Documentation.** Contains compliance manuals covering GST tax collection auditing guidelines, PDPA data privacy, and ledger retention policies.

---

## ⚡ Quick Start (Root Directory Commands)

For convenience, a root-level [package.json](package.json) is provided. It delegates common scripts down to the flagship web application (`web/`) using the npm `--prefix` setting. You do not need to manually change directories (`cd`) to get started:

```bash
# 1. Clone the repository
git clone https://github.com/thiozhaosheng/ClaimFlow.git
cd ClaimFlow

# 2. Install dependencies for the Flagship Next.js application
npm install --prefix web

# 3. Spin up the flagship dev server (Turbopack)
npm run dev
# App will boot on http://localhost:3000

# 4. Build the application to verify code compilation
npm run build
```

---

## 🎓 Student Reference Guide: Core Technical Concepts Explained

This repository is designed as an educational showcase for clean code, design patterns, and modern framework mechanics. Below is a breakdown of the core computer science concepts implemented in this project:

### 1. The Repository Pattern & Interface Mocking
In standard applications, components query databases directly. If you switch databases, the entire app breaks. In ClaimFlow:
* **The Architecture:** We define a strict interface layer representing database operations. 
* **The Implementation:** The flagship app reads from a mock client repository ([claims.repo.ts](web/src/data/repositories/claims.repo.ts)) that runs in-memory.
* **Why it matters:** This decouples frontend developers from backend deployment blockers. Swapping from mock databases to a real PostgreSQL database is done by changing a single line of configuration, leaving all UI components completely untouched.

### 2. Pure Render Cycles & Hydration Safety
* **The Problem:** In SSR (Server-Side Rendering) frameworks like Next.js, pages compile first on the server, then "hydrate" on the client. If a component generates a random ID (`Math.random()`) or gets the current timestamp (`Date.now()`) during the render loop, the server's HTML will mismatch the client's output, triggering a Next.js hydration error.
* **The Solution:** 
  1. We use React's built-in `useId()` hook for generating deterministic, HTML-safe element IDs.
  2. Dynamic calculations (like time-of-day greetings or runway burn dates) are bound to local state variables and deferred to client-side mount events via a `useEffect` callback.

### 3. Preventing Cascading Renders (`setTimeout` in Effects)
* **The Problem:** React warns you if you update component state synchronously inside a `useEffect` during rendering (e.g., `setMounted(true)` or `setIsMac(true)` immediately on component mount). This triggers a second, immediate layout and rendering cycle right after the first, hurting rendering performance.
* **The Solution:** We wrap state-updating hooks inside a `setTimeout(() => { ... }, 0)` block. This pushes the state mutation to the very next tick of the JavaScript event loop, letting the initial render cycle complete cleanly before processing the state change.

### 4. Pre-Compiled Policy Engines (Closure Concept)
* **The Problem:** Expense claim audit rules (under IRAS tax compliance) evaluate multiple claims rapidly. Running string splits, regex parsing, and condition checking repeatedly during data grids scrolling slows down UI frame rates.
* **The Solution:** The ClaimFlow Policy Engine ([engine.ts](web/src/core/domain/policy/engine.ts)) pre-compiles JSON rule trees into native JavaScript closures upon module load. Parsing is done once, and subsequent claims evaluation runs instantly in memory.

### 5. Role-Based Access Control (RBAC) & UX Blurring
* **The Problem:** Employees should not see or invoke manager approvals or financial disbursals.
* **The Solution:** ClaimFlow implements role separation. On the UI level, when holding down the modifier key (`Meta`/`Control`), navigation endpoints unauthorized for the active role are dynamically blurred (`filter: blur(2.5px)`) and desaturated, demonstrating access boundaries visually. On the database level, approving officers are filtered to view only claims matching their specific department.

### 6. Interactive 3D Physics and Liquid Glass Mechanics
* **Spotlight Mouse Tracking:** Hovering over dashboard statistics cards projects a moving light spot. This is achieved by binding mouse coordinates to motion values (`useMotionValue`) and outputting a dynamic radial gradient template string in real-time.
* **Double-Nested 3D Flipping:** Decoupling hover physics from flip triggers is tricky. We wrap the Citibank credit card in nested divs—the parent handles cursor 3D tilting (`rotateX`/`rotateY`), while the child handles the 180-degree flip animation. This avoids layout wiggles and ensures silky-smooth transitions.

---

## 👥 Sandbox User Profiles (Three-Role Architecture)

The sign-in panel features three distinct profiles, allowing you to test each role's perspective:

| Persona | Role | Email | Password |
|---|---|---|---|
| **Sarah Tan** | Employee | `demo.employee@claimflow.com` | `claimflow-demo` |
| **Marcus Lim** | Approving Officer | `demo.manager@claimflow.com` | `claimflow-demo` |
| **Dan Yeo** | Finance Admin | `demo.finance@claimflow.com` | `claimflow-demo` |

---

## 🚶‍♂️ Core Walkthrough Journey

1. **Upload & Auto-Approval (Sarah Tan):** Log in as Sarah, drag and drop `grab-transport.pdf` from the fixtures panel, and watch the OCR parse the date, merchant, and tax. Submit the claim. Since it falls under the S$50 threshold, it auto-endorses instantly.
2. **Policy Violation (Sarah Tan):** Submit a "Client Entertainment" claim without adding a business justification. The form pre-flight check will block the submission, highlighting the specific rule violated (IRAS audit requirement).
3. **Manager Review (Marcus Lim):** Log in as Marcus. Open the pending endorsement queue. Examine the Claim Process Map—you can click each node to inspect OCR confidence ratings, IRAS duplicate logs, and audit trails. Endorse the claim.
4. **Treasury Settlement (Dan Yeo):** Log in as Dan. View the overall SME runway simulator and live daily burn metrics. Select endorsed claims in the Payment Queue and trigger disbursal via FAST PayNow gateway.

---

## 💡 Troubleshooting & Common Development Pitfalls

* **`EADDRINUSE` Errors (Port 3000/4000 Taken):** A previous process was not closed properly. Find the process using `lsof -i :3000` (or `lsof -i :4000`), run `kill -9 <PID>`, and reboot.
* **Next.js Compile Caching Out of Sync:** If the Next.js compilation cache gets confused after multiple code changes:
  ```bash
  rm -rf web/.next
  npm run build
  ```
* **Stale Local Database Seeds:** If mock claims or actions get stuck, clear your browser's local storage cache or click "Log Out" to force a clean re-seed of the database repository mock.
