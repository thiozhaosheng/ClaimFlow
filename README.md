# ClaimFlow

Role-based expense claim portal for SMEs. Submitted as the capstone for NP-CET DFS IP Run 2.

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
![React Router](https://img.shields.io/badge/React%20Router-6-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)

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

**Infrastructure**

![Microsoft Azure](https://img.shields.io/badge/Microsoft%20Azure-PostgreSQL%20%2B%20Blob%20Storage%20%2B%20Document%20Intelligence%20%2B%20App%20Service-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)

## Run it

Prerequisites: Node 20 LTS, npm, and either a local PostgreSQL 14+ or access to the project's Azure database (your IP must be whitelisted by the Infrastructure Lead first).

```bash
git clone https://github.com/thiozhaosheng/ClaimFlow
cd ClaimFlow
```

Backend API:

```bash
cd backend/api
cp .env.example .env          # fill DATABASE_URL and JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev                   # http://localhost:4000
```

Frontend:

```bash
cd frontend
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

## Demo accounts

The seed creates three accounts for evaluation. The login page has one-click sign-in buttons for each.

| Role | Email | Password |
|---|---|---|
| Employee | demo.employee@claimflow.com | claimflow-demo |
| Manager | demo.manager@claimflow.com | claimflow-demo |
| Finance Admin | demo.finance@claimflow.com | claimflow-demo |

## Layout

```
backend/api/              REST API — TypeScript, Express, Prisma
backend/auth-gateway/     Auth proxy — JavaScript, Express
database/                 Reference SQL (live schema is managed by Prisma)
docs/                     Project documentation
frontend/                 Web client — React + Vite
```

## Where to find things

- API reference: `http://localhost:4000/api/docs` (Swagger UI, while the API is running)
- Full report and design rationale: the submitted project document
- Schema source of truth: `backend/api/prisma/schema.prisma`
