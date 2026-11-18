# FaithTech Astrology Mobile Application -- Backend API

Enterprise-grade, secure, production-ready REST API backend for an Astrology Mobile Application for Android and iOS. Built with Node.js LTS, Express.js, TypeScript (strict mode), PostgreSQL 18, and Prisma ORM.

---

## 1. Feature Overview

- **Authentication & Onboarding:**
  - Mobile phone signup and login with cryptographically secure 6-digit OTPs.
  - Canonical E.164 phone number normalization (`libphonenumber-js`).
  - HMAC-SHA256 hashed OTPs at rest with per-challenge salt and server secret.
  - Constant-time verification (`crypto.timingSafeEqual`) preventing timing side-channel leaks.
  - Anti-enumeration protection on public signup and login initiation.
  - Strict 60-second resend cooldown and attempt throttling.
- **Session & Token Management:**
  - Short-lived stateless JWT access tokens (15-minute validity).
  - High-entropy cryptographically random opaque refresh tokens (30-day validity).
  - Refresh Token Rotation (RTR) on every refresh.
  - Automatic reuse detection revoking the entire token family upon detection of compromised tokens.
  - Immediate session revocation support for single device logout and revoke-all devices.
- **User Profile Management:**
  - Retrieve and update own profile with strict allowlists (rejecting mass assignment).
  - Secure signed profile photo upload flow.
  - Optional email verification with 6-digit verification code.
- **Astrology Birth Details:**
  - Local birth date and local birth time semantics preservation without artificial midnight conversion.
  - Explicit time accuracy enum (`EXACT`, `APPROXIMATE`, `UNKNOWN`).
  - High-precision geographic coordinates (`decimal(9,6)`).
  - Strict IANA timezone validation (`Intl.DateTimeFormat`).
- **Account Lifecycle & Compliance:**
  - Mobile-number migration with two-step OTP verification on new number.
  - Account deactivation with immediate session termination.
  - Account deletion request with 30-day scheduled grace period.
  - Immutable audit logs for compliance.

---

## 2. Architecture & Technology Stack

| Component | Technology | Version |
|---|---|---|
| Runtime | Node.js | v24 LTS |
| Language | TypeScript | v5.6 (Strict Mode) |
| Web Framework | Express.js | v4.21 |
| Database | PostgreSQL | v18 / v16 |
| ORM | Prisma | v5.22 |
| Validation | Zod | v3.23 |
| Logging | Pino | v9.5 |
| API Docs | OpenAPI 3.0 / Swagger UI | v5.0 |
| Testing | Jest + Supertest + ts-jest | v29 |

---

## 3. Getting Started

### Prerequisites
- Node.js v20+ and npm v10+
- PostgreSQL v16+ (or Docker)

### Installation
```bash
# Clone the repository and enter directory
cd FaithTechAPI

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Sync schema to PostgreSQL
npm run prisma:push

# Seed development test data
npm run prisma:seed
```

### Running the Application
```bash
# Development mode with hot-reload
npm run dev

# Production build and run
npm run build
npm start
```

Once running:
- **API Base URL:** `http://localhost:3000`
- **Swagger UI Interactive Documentation:** `http://localhost:3000/api/docs`
- **Health Check Probe:** `http://localhost:3000/health`
- **Database Readiness Probe:** `http://localhost:3000/ready`

---

## 4. Automated Testing & QA

Run the automated test suite with full coverage:

```bash
# Run all 35 tests (Unit, Integration, VAPT Security)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run security / VAPT tests only
npm run test:security
```

---

## 5. Postman Collection

Import the following files located in the `postman/` directory into Postman:
1. `postman/FaithTech_Astrology_API.postman_collection.json`
2. `postman/FaithTech_Local.postman_environment.json`

Set the active environment to **FaithTech Local Environment**. Signup and login requests automatically capture the `challengeId`, `accessToken`, and `refreshToken` variables for subsequent requests.

---

## 6. Security (VAPT) Controls

- **OWASP API 1 (BOLA/IDOR):** User identity is always derived from server-verified JWT claims (`req.user.id`). Client-supplied IDs in bodies or routes are ignored or strictly rejected.
- **OWASP API 2 (Broken Authentication):** Tampered tokens or mismatched signatures are rejected. Compromised refresh token reuse revokes the entire token chain.
- **OWASP API 3 (Broken Object Property Level Authorization):** Zod schemas enforce `.strict()` parsing, actively preventing mass assignment of internal fields (`role`, `status`, `userId`).
- **OWASP API 4 (Unrestricted Resource Consumption):** Rate limiters protect unauthenticated OTP initiation, verification endpoints, and general routes.
- **OWASP API 8 (Security Misconfiguration):** Helmet sets secure HTTP headers. Error handlers strip stack traces, database queries, and internal paths. Sensitive credentials (OTP, secret, tokens) are censored from logs and traces.
