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

<details>
<summary><b>📐 Click to Expand: System Use Case Diagram (Mermaid)</b></summary>

```mermaid
graph LR
    %% Actors
    Emp[Employee]
    Mgr[Manager]
    Fin[Finance Admin]

    subgraph ClaimFlow Web Portal
        UC_Login(Login / Authenticate)
        
        %% Employee Use Cases
        UC_Submit(Submit Claim)
        UC_Upload(Upload Digital Receipt)
        UC_View[View Personal Claim Status]
        
        %% Manager Use Cases
        UC_Review(Review Departmental Claims)
        UC_Decide(Approve / Reject Claim)
        
        %% Finance Use Cases
        UC_Process(Process Final Reimbursement)
        UC_Config(Manage System Configuration)
        UC_Audit(View System Audit Logs)
    end

    %% Security Linkages
    UC_Submit -.-> |include| UC_Login
    UC_Upload -.-> |include| UC_Login
    UC_View -.-> |include| UC_Login
    UC_Review -.-> |include| UC_Login
    UC_Decide -.-> |include| UC_Login
    UC_Process -.-> |include| UC_Login
    UC_Config -.-> |include| UC_Login
    UC_Audit -.-> |include| UC_Login

    %% Actor Connections
    Emp --> UC_Submit
    Emp --> UC_Upload
    Emp --> UC_View
    
    Mgr --> UC_Review
    Mgr --> UC_Decide
    
    Fin --> UC_Process
    Fin --> UC_Config
    Fin --> UC_Audit

---

## 🧪 Testing & Quality Assurance Plan
Quality Assurance operates in parallel with code assembly. Our testing framework targets validation vulnerablities directly before software configurations are pushed to production.

### 1. The Happy Path (Standard Operational Flow)
Verifies that expected, valid user behaviors yield successful database transactions.
* *Scenario:* An Employee provides an authenticated session, inputs a valid decimal value into the `Amount` field, attaches an image receipt format, and receives a sucessful `201 Created` status code while the claim status initializes to `Pending Review`.

### 2. Edge-Case Mitigation (Defensive Software Design)
Ensures the system gracefully captures input failures and invalid traffic without throwing application breaks or crashing active server routes.
* *Scenerio 1 (Invalid Inputs):* An Employee inputs an alphabetical string, symbols, or a negative integer inside a numeric field.
* *Scenario 2 (File Validation Bypass):* A user attempts to upload a corrupted text file, an unapproved format, or an excessively large binary object in place of a standard receipt image.

---

## 🚀 Getting Started

### Prerequisities
*(List required runtime engines, package managers, and software versions here—e.g. Node.js v18+, PostgreSQL v15, etc.)*
* Requirement A
* Requirement B
* Requirement C

### Installation & Local Setup
```bash
# 1. Clone the project repository 
git clone [https://github.com/](http://github.com/)[thiozhaosheng]/ClaimFlow.git

# 2. Enter workspace directory
cd 

# 3. Install core dependencies
npm install

# 4. Initialize local environment variables (.env)
cp .env.example .env

#5. Boot local development instances
npm run dev