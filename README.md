# ClaimFlow Web Portal
> A digital claims management application tailored for SMEs to eliminate data loss and automate reimbursement tracking

---

## 📌 Project Overview
This repository serves as the primary technical codebase and comprehensive documentation hub for our full-stack software engineering project. Designed to showcase a rigorous, test-driven application lifecycle, **ClaimFlow** addresses the inefficiencies of manual, paper-based, and fragmented corporate expense management environments.

### Problem Statements & Goals
SMEs frequently face administrative burdens due to lost physical receipts, opaque approval structures, and disjointed payment tracking. ClaimFlow eliminates manual data entry errors, shortens processing turnaround times, secures financial records using robust access rules, and ensures web system stability through a strict quality assurance workflow.

---

## 👥 The Team & Technical Roles
To maintain accountability and clear technical boundaries throughout the development lifecycle, project responsibilities are designated as follows:

* **[Ang Bi Jun]** - Lead Frontend Engineer
    * *Responsibilities:* Client-side state management, reponsive UI/UX implementation, and front-to-back API integration.
* **[Wong Sin Yaw]** - Lead Backend Engineer
    * *Responsibilties:* RESTful API design, database normalisation, relational mapping, and core server-side business logic.
* **[Travis Thio]** - Lead Infrastructure Engineer
    * *Responsibilities:* Repository access control, environment configuration management (`.env`), deployment orchestration, hosting environment stability, and uptime monitoring.
* **[Wong Lian Yi Daniel]** - Lead Quality Assurance (QA) & Technical Writer
    * *Responsibilities:* Technical documentation mapping, user scenario drafting, edge-case testing verification, defect triage, and system validation.

--- 

## 🏗️ System Architecture & Logic

### Role-based Access Control (RBAC)
To protect financial audit logs and enforce proper business boundaries, ClaimFlow establishes three distinct human actors with non-overlapping permission scopes:

1. **Employee:** The transactional actor who submits claim line-items, inputs monetary values, and uploads digital receipt evidence. 
2. **Manager:** The department oversight actor responsible for examining claims originating within their unit, holding the authority to either `Approve` or `Reject` requests.
3. **Finance Admin:** The root administrative processor responsible for authorizing final monetary disbursements and reviewing comprehensive, immutable audit histories.

### Core Functional Use Case
* **Session Authentication:** All system entry points command an authentication barrier to safeguard data integrity and protect corporate records.
* **Claim Lifecycle Automation:** Claims move predictably along an explicit linear state path: `Submitted` —> `Pending Review` —> `Approved/Rejected`—> `Reimbursed`.
* **System Logging:** Operational actions performed by managerial or administrative personnel are logged to ensure system transparency. 

---