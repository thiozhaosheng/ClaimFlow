# ClaimFlow API Documentation (Auth Gateway)

This document outlines the API endpoints provided by the Auth Gateway (`port 3001`). The frontend should use the `authService.js` SDK to interact with these endpoints.

**Base URL:** `http://localhost:3001`

---

## 1. Authentication

### Login
- **URL:** `/api/users/login`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword"
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "status": "success",
    "token": "jwt-token-string",
    "data": { "user": { "id": 1, "name": "...", "role": "Employee", "department": "..." } }
  }
  ```

### Register
- **URL:** `/api/users/register`
- **Method:** `POST`
- **Body:** `{ "email", "password", "name", "role", "department" }`
- **Success Response:** `201 Created`
  ```json
  {
    "status": "success",
    "data": { "user": { "id": 2, "email": "...", "role": "..." } }
  }
  ```

---

## 2. User Management

### Update Password
- **URL:** `/api/users/update-password`
- **Method:** `PATCH`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "newPassword": "newpassword123"
  }
  ```

---

## 3. Claims Management

### Fetch All Claims
- **URL:** `/api/claims`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <token>`
- **Success Response:**
  ```json
  {
    "status": "success",
    "results": 1,
    "data": { 
      "claims": [ { "id": 1, "amount": 100, "status": "Submitted", "category": "Transport", "expenseDate": "..." } ] 
    }
  }
  ```

### Submit New Claim
- **URL:** `/api/claims`
- **Method:** `POST`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "amount": 145.50,
    "category": "Meal",
    "expenseDate": "2026-05-11",
    "description": "Lunch with client"
  }
  ```

---

## 4. Workflow (Approvals)

### Review Claim (Endorse/Reject)
- **URL:** `/api/workflow/review/:id`
- **Method:** `PATCH`
- **Headers:** `Authorization: Bearer <token>`
  ```json
  {
    "action": "approve", 
    "remarks": "Valid receipt provided."
  }
  ```
*Note: Valid statuses are `Approved`, `Rejected`, or `Reimbursed`.*

---

*This API is proxied to the Base Service (Port 3000) internally by the Auth Gateway.*
