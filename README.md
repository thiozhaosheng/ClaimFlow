# ClaimFlow

Digital expense claim management for SMEs. Replaces ad-hoc submission over WhatsApp and similar channels with a role-based portal where claims are submitted, reviewed, and reimbursed through a defined workflow with a complete audit trail.

Built as the capstone project for NP-CET DFS IP Run 2.

## The Team

| Name | Role | Responsibilities |
|---|---|---|
| Ang Bi Jun | Lead Frontend Engineer | Client-side state, responsive UI, frontend to API integration |
| Wong Sin Yaw | Lead Backend Engineer | REST API design, server-side logic, database integration |
| Travis Thio | Lead Infrastructure Engineer | Azure setup, environment configuration, deployment, monitoring |
| Wong Lian Yi Daniel | Lead QA & Technical Writer | Documentation, test design, edge-case testing, defect tracking |

## What it does

Three user roles, each with their own scope:

- **Employee** submits expense claims and uploads receipts (JPEG or PNG).
- **Manager** reviews claims submitted within their department and either endorses or rejects them. Rejections require a reason that is returned to the claimant.
- **Finance Admin** processes endorsed claims for reimbursement and reviews the audit trail. Audit data is exportable as CSV.

Every claim moves through a fixed lifecycle:

```
Submitted -> Pending Review -> Endorsed or Rejected -> Reimbursed
```

Every status change is recorded with a timestamp, the actor that performed it, and the previous and new state.

## Tech Stack

**Frontend** (`frontend/login-dashboard/`)
- React 18 with Vite 5
- React Router 6
- Bootstrap 5.3 utility classes
- FontAwesome 6 icons
- Inter and SF Pro typography
- Custom CSS with design tokens, dark mode, and a gradient mesh sign-in background

**Backend API** (`backend/api/`)
- Node.js with Express 4
- TypeScript 5
- Prisma 5 ORM
- PostgreSQL 14 or newer
- JSON Web Tokens via `jsonwebtoken`
- `bcrypt` for password hashing
- `zod` for request validation
- `helmet` for security headers
- `express-rate-limit` for brute-force throttling
- Swagger UI for API documentation

**Auth Gateway** (`backend/auth-gateway/`)
- Node.js with Express 4 (plain JavaScript)
- Proxies authentication and selected routes to the API or a downstream service
- Same security middleware stack as the API

**Database** (`database/`)
- PostgreSQL (Azure Database for PostgreSQL Flexible Server in production, any local Postgres for development)
- Schema managed through Prisma migrations
- Seed data lives in `backend/api/prisma/seed.ts`

## Project Structure

```
ClaimFlow/
  backend/
    api/                 main REST API (TypeScript + Prisma)
      prisma/            schema and seed data
      src/
        config/          env loading, db client, swagger
        controllers/     auth, claim, user, workflow
        middleware/      auth (JWT), validate (zod), security (cors/helmet/rate-limit)
        models/          thin db access layer per entity
        routes/          express routers
        schemas/         zod schemas
    auth-gateway/        auth proxy (JavaScript)
  database/              raw SQL schema and reference seed
  docs/                  API documentation, npm notes
  frontend/
    login-dashboard/     primary web client (Vite + React)
    ui-scaffold/         early empty scaffold, kept for reference
  .gitignore
  LICENSE
  README.md
```

## Local Development

### Prerequisites

- Node.js 20 LTS
- npm 10 or newer
- PostgreSQL 14 or newer (or access to an existing Postgres database)
- Git

### Setup

```
git clone https://github.com/thiozhaosheng/ClaimFlow
cd ClaimFlow
```

### Backend API

```
cd backend/api
cp .env.example .env
```

Edit `.env`:
- Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
- Set `DATABASE_URL` (URL-encode any special characters in the password)
- Adjust `CORS_ORIGINS` to include your frontend origin

Then:

```
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The API defaults to port `4000`.

### Auth Gateway

```
cd backend/auth-gateway
cp .env.example .env
```

The `JWT_SECRET` in this file must be identical to the one used by `backend/api`, otherwise tokens issued by either service will not validate against the other.

```
npm install
npm run dev
```

The auth gateway defaults to port `4001`.

### Frontend

```
cd frontend/login-dashboard
cp .env.example .env
```

`VITE_API_BASE_URL` should point at the running API. With the defaults above:

```
VITE_API_BASE_URL=http://localhost:4000
```

Then:

```
npm install
npm run dev
```

The Vite dev server serves on port `3000`. Open `http://localhost:3000`.

### Demo Accounts

The seed script creates three accounts that match the demo buttons on the sign-in page. All three share the same password.

| Role | Email | Password |
|---|---|---|
| Employee | demo.employee@claimflow.com | claimflow-demo |
| Manager | demo.manager@claimflow.com | claimflow-demo |
| Finance Admin | demo.finance@claimflow.com | claimflow-demo |

The password can be overridden at seed time by setting `DEMO_PASSWORD` in `backend/api/.env` before running the seed script.

## API Documentation

With the API running, Swagger UI is available at `http://localhost:4000/api/docs`. Endpoint schemas, parameters, and response codes are documented inline in the controllers via JSDoc and rendered through `swagger-jsdoc`.

## Security

Defaults that apply to both backend services:

- Passwords are hashed with bcrypt at cost factor 10 and are never stored or logged in plain text.
- JWTs are signed with HS256 using a server-side secret read from the environment. The service refuses to start if `JWT_SECRET` is missing.
- Login responses run a constant-time bcrypt compare even when the email is unknown, so request timing does not reveal which emails are registered.
- Rate limits per IP: 5 requests per 15 minutes on auth endpoints (login, register, password update), 120 requests per minute on the rest of the API.
- CORS uses an explicit allowlist from `CORS_ORIGINS`. Unknown origins are rejected.
- Helmet sets security headers on every response.
- Input validation on auth endpoints uses zod schemas. Validation errors return a structured 400 response.
- Secrets live only in `.env` files, which are covered by `.gitignore` (including any nested `**/.env`). The `.env.example` in each service folder lists every required and optional key.
- Any 401 from the API clears the stored frontend token and redirects to the sign-in page.

When using Azure Database for PostgreSQL Flexible Server, the developer's public IP must be added to the firewall allowlist before local connections will succeed.

## Deployment and Infrastructure

| Component | Technology | Purpose |
|---|---|---|
| Frontend Hosting | Azure Static Web Apps | Serves the built Vite bundle to end users |
| Backend Server | Azure App Service (Node.js) | Hosts the Express API and the auth gateway |
| Relational Database | Azure Database for PostgreSQL Flexible Server | Stores user profiles, claim metadata, and audit logs |
| Object Storage | Azure Blob Storage | Stores uploaded receipt image files |
| Environment Config | `.env` files (excluded from version control) | Secrets and per-environment configuration |

### Environment Variables

| Variable | Service | Description |
|---|---|---|
| NODE_ENV | api, auth-gateway | `development`, `production`, or `test` |
| PORT | api, auth-gateway | Port the service listens on |
| DATABASE_URL | api | Postgres connection string. URL-encode any special characters in the password |
| JWT_SECRET | api, auth-gateway | Server-side signing key, must match across both services |
| JWT_EXPIRES_IN | api | Token expiry, supports `15m`, `12h`, `7d`, etc. |
| CORS_ORIGINS | api, auth-gateway | Comma-separated allowlist of frontend origins |
| BASE_SERVICE_HOST | auth-gateway | Hostname of the upstream service the gateway proxies to |
| BASE_SERVICE_PORT | auth-gateway | Port of the upstream service |
| BASE_SERVICE_TIMEOUT | auth-gateway | Request timeout in milliseconds |
| HITPAY_API_KEY | api | Payment provider API key (optional, only if disbursement is wired up) |
| HITPAY_SALT | api | Payment provider signing salt (optional) |
| DEMO_PASSWORD | seed script | Password used for the seeded demo accounts |
| VITE_API_BASE_URL | frontend | Base URL of the API the frontend should call |

Real values for each environment are kept in `.env` files outside the repository. Every service ships an `.env.example` describing the required and optional keys.

## Testing

Test cases, edge-case scenarios, and defect tracking live alongside the documentation in `docs/`. Current coverage focuses on:

- Authentication and role authorization at both the route and middleware layers
- Claim lifecycle state transitions
- Receipt upload validation
- Audit log completeness for every status change

## License

This project is licensed under the terms of the LICENSE file in the repository root.
