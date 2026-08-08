<div align="center">
  <h1>ClaimFlow</h1>
  <p><b>Role-based expense claim portal for Singapore SMEs</b></p>

  <p>
    <img src="https://img.shields.io/badge/React-19-blue.svg?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Vite-5.0-646CFF.svg?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Express-API-000000.svg?logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/PostgreSQL-Database-336791.svg?logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Azure-Document_Intelligence-0078D4.svg?logo=microsoft-azure&logoColor=white" alt="Azure" />
  </p>
</div>

<br/>

> ClaimFlow handles claim submission with receipt OCR, IRAS/GST policy checks, manager review, and finance payout across three interconnected roles: Employee, Approving Officer, and Finance Admin.

---

## Architecture

```mermaid
graph TD
    UI[Frontend UI<br/>React + Vite]
    Gateway[Auth Gateway<br/>Rate Limiting]
    API[Backend API<br/>Core Logic & Policy]
    DB[(PostgreSQL)]
    Azure[Azure AI<br/>Receipt OCR]

    UI -- HTTP Requests --> Gateway
    Gateway -- Proxied Requests --> API
    API -- Reads/Writes --> DB
    API -- OCR Processing --> Azure
```

* **`frontend/`** — React UI, context providers, and mock data fallback.
* **`backend/api/`** — Express API, Prisma/Postgres, business logic, and OCR integrations.
* **`backend/auth-gateway/`** — Reverse proxy to the backend API.
* **`docs/`** — Compliance notes (GST/IRAS, PDPA, retention policy).

---

## User Journey

```mermaid
sequenceDiagram
    participant E as Employee
    participant S as Policy Engine
    participant M as Manager
    participant F as Finance

    E->>S: Upload Receipt & Submit
    S-->>S: Azure OCR & IRAS Policy Check
    
    alt Auto-Approve (e.g., < $50 Transport)
        S->>F: Route directly to Finance
    else Requires Approval
        S->>M: Route to Manager's Queue
        M->>F: Manager Endorses
    end
    F->>E: Disburse Funds (FAST/GIRO)
```

1. **Submit (Sarah Tan):** Upload a receipt using the "simulate Grab receipt" option. The system runs an OCR pass, auto-fills the amount, and checks IRAS policies. Small transport claims bypass managers.
2. **Policy Block (Sarah Tan):** Submit a Client Entertainment claim without a business justification. The engine instantly blocks the submission based on IRAS requirements.
3. **Review (Marcus Lim):** The Approvals Queue highlights pending claims from the manager's department.
4. **Payout (Dan Yeo):** Finance models treasury runways and clears endorsed claims for payout.

### Demo Personas

| Persona | Role | Email | Password |
|---|---|---|---|
| **Sarah Tan** | Employee | `demo.employee@claimflow.com` | `claimflow-demo` |
| **Marcus Lim** | Approving Officer | `demo.manager@claimflow.com` | `claimflow-demo` |
| **Dan Yeo** | Finance Admin | `demo.finance@claimflow.com` | `claimflow-demo` |

---

## Quick Start

### Frontend Only (Mock Mode)
No backend required. Falls back to a simulated localStorage environment.
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

### Full Stack (Production Ready)
Requires an Azure AI Document Intelligence endpoint and a PostgreSQL database.

**1. Configure Environment (`backend/api/.env`)**
```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET=your_secret_key
AZURE_DOC_INTEL_ENDPOINT=your_endpoint
AZURE_DOC_INTEL_KEY=your_key
```

**2. Boot Services**
```bash
# Terminal 1: API
cd backend/api && npm install && npm run dev      # http://localhost:3000

# Terminal 2: Gateway
cd backend/auth-gateway && npm install && npm run dev  # http://localhost:4000

# Terminal 3: UI
cd frontend && npm install && npm run dev         # http://localhost:5173
```

---

## Testing Strategy

ClaimFlow implements a "Vertical Slice" testing strategy to guarantee zero regressions.

```mermaid
pie title Testing Pyramid
    "E2E (Playwright)" : 15
    "Performance (k6)" : 10
    "Integration (Supertest)" : 30
    "Unit (Jest)" : 45
```

- **Unit Testing:** `jest` coverage for the Policy Engine and OCR Azure stubs.
- **Integration:** `supertest` for validating API route responses.
- **E2E:** `Playwright` drives headless Chromium to automate Employee Submissions.
- **Performance:** `k6` load scripts simulate 20 VUs ensuring < 500ms latency.
- **CI/CD:** GitHub Actions block any broken code on push/PR to `main`.

<!-- Refreshed: 2026-07-22T08:27:50Z -->
