# Astrology Mobile App -- Complete Backend Development Master Prompt

**Technology stack:** Node.js, Express.js, TypeScript, PostgreSQL,
Prisma ORM\
**Scope:** Mobile-number signup/login with OTP, JWT sessions, user
profile, astrology birth details, automated QA, API documentation, and
VAPT/security testing.

------------------------------------------------------------------------

## How to use this document

Copy this entire prompt into your AI coding assistant (ChatGPT, Cursor,
GitHub Copilot, Claude, etc.). Ask it to execute the phases in order. It
must complete one phase, show its deliverables and tests, and wait for
your approval before moving to the next phase.

Do not ask the AI to generate the whole system in one response. Require
complete, runnable code with exact file paths, migrations, tests, and
setup instructions.

# MASTER PROMPT

## 1. Role and objective

Act as a Senior Node.js Solution Architect, TypeScript Backend Engineer,
PostgreSQL Database Architect, QA Automation Engineer, and Application
Security Engineer.

Design and implement a production-ready, secure, scalable REST API
backend for an Astrology Mobile Application consumed by Android and iOS
apps.

The first release must support:

-   New-user signup using mobile number and OTP.
-   Existing-user login using mobile number and OTP.
-   OTP generation, delivery, verification, expiry, resend, throttling,
    and abuse prevention.
-   JWT access-token and refresh-token lifecycle management.
-   User profile creation, retrieval, and updates.
-   Mobile-number change with verification of the new number.
-   Optional email verification.
-   Astrology birth details: date, time, accuracy, place, coordinates,
    and timezone.
-   Logout from one device and all devices.
-   Account deactivation and deletion requests.
-   Consent and audit records.
-   Comprehensive functional, negative, integration, concurrency, and
    security tests.
-   API documentation, Postman collection, VAPT checklist, and
    deployment guidance.

Do not implement astrology calculations, Kundli generation, payment,
chat, video calls, or astrologer workflows in this phase. Keep the
design extensible for those future modules.

## 2. Technology stack and engineering standards

Use the following stack unless a genuine technical limitation is
explained and approved:

  -----------------------------------------------------------------------
  Area                                Technology
  ----------------------------------- -----------------------------------
  Runtime                             Current supported Node.js LTS

  Language                            TypeScript with strict mode

  HTTP framework                      Express.js

  Database                            PostgreSQL

  ORM and migrations                  Prisma ORM

  Validation                          Zod

  Authentication                      JWT access tokens

  Refresh sessions                    Opaque cryptographically random
                                      refresh tokens, stored as hashes

  OTP                                 SMS provider behind an
                                      adapter/interface

  Distributed throttling              Redis recommended for
                                      multi-instance deployments

  Logging                             Pino

  Security middleware                 Helmet

  Rate limiting                       Redis-backed limiter in production

  API documentation                   OpenAPI 3.x / Swagger UI

  Unit/integration testing            Jest or Vitest, plus Supertest

  API manual testing                  Postman

  Security testing                    OWASP ZAP and Burp Suite

  Containerization                    Docker and Docker Compose

  CI                                  Automated lint, type-check, test,
                                      migration validation, and
                                      dependency scan
  -----------------------------------------------------------------------

Use exact, compatible package versions and document them. Do not use
deprecated packages or insecure defaults. Use npm unless the repository
already uses another package manager.

Engineering requirements:

-   TypeScript strict mode; avoid `any`.
-   Async/await and proper error propagation.
-   Dependency injection or explicit dependency composition.
-   Thin controllers; business logic belongs in services.
-   Database access belongs in repositories/data-access modules.
-   DTOs and explicit response mapping; never return ORM entities
    directly.
-   Centralized error handling and request validation.
-   Configuration from validated environment variables.
-   UTC timestamps.
-   Structured logs with correlation/request IDs.
-   Cancellation/timeout handling where appropriate.
-   Idempotency and concurrency protection for sensitive workflows.
-   No secrets, credentials, real OTPs, or production personal data in
    source control or test fixtures.
-   No pseudocode in implementation phases. If a detail is unknown,
    state the assumption and ask before making a consequential decision.

## 3. Architecture and project structure

Use a modular, maintainable architecture. A suggested structure is:

``` text
astrology-backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── security.ts
│   ├── common/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── auth.types.ts
│   │   ├── otp/
│   │   ├── users/
│   │   ├── profiles/
│   │   ├── birth-details/
│   │   ├── sessions/
│   │   ├── consents/
│   │   └── audit/
│   ├── integrations/
│   │   └── sms/
│   └── docs/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   └── fixtures/
├── postman/
│   ├── collection.json
│   └── environments/
├── docs/
│   ├── architecture/
│   ├── test-cases/
│   ├── vapt/
│   └── deployment/
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

You may improve this structure if there is a clear reason. Explain the
final structure and responsibilities of each module.

## 4. Functional requirements and workflows

### 4.1 Signup

Implement a two-step signup flow:

1.  Mobile client submits country calling code and mobile number.
2.  Normalize and validate the number using a reliable phone-number
    library. Store a canonical E.164 representation.
3.  Apply rate limits before sending an SMS.
4.  Initiate OTP verification for the signup purpose.
5.  Generate a cryptographically secure, short-lived OTP.
6.  Store only a keyed digest/HMAC of the OTP, with expiry, attempt
    count, purpose, destination, and status.
7.  Send the OTP through an SMS provider adapter.
8.  Client submits the OTP and an opaque verification/challenge
    identifier.
9.  Verify OTP atomically. Expired, consumed, superseded, or locked
    challenges must fail.
10. Create the user only after successful verification.
11. Enforce a database unique constraint on normalized mobile number to
    prevent duplicate accounts under concurrent requests.
12. Create a session and issue access and refresh tokens.
13. Return the authenticated user summary and tokens using the agreed
    response contract.

The signup verification operation must be transaction-safe. Do not mark
an OTP as consumed separately from user creation/session creation in a
way that can leave inconsistent state. Consider database transaction
boundaries and external SMS delivery failure.

Do not reveal unnecessary account-existence information. Define a
consistent public response strategy that limits user enumeration while
still allowing the mobile app to proceed.

### 4.2 Login

1.  Client submits mobile number.
2.  Normalize and validate the number.
3.  Apply IP, number, device-signal, and global/provider-level abuse
    controls.
4.  Initiate a login OTP challenge.
5.  Send OTP using the SMS adapter.
6.  Client submits challenge ID and OTP.
7.  Verify challenge and confirm the account is eligible to log in.
8.  Atomically consume the OTP and create a session.
9.  Issue access and refresh tokens.
10. Return a minimal user summary and authentication information.

Define the behavior for unregistered, inactive, deactivated,
deletion-pending, and blocked accounts. Avoid leaking account status to
unauthenticated callers.

### 4.3 OTP resend

Provide a dedicated resend endpoint.

-   Require a valid challenge or a controlled restart of the OTP flow.
-   Enforce a configurable resend cooldown.
-   Enforce per-number, per-IP, per-device, and global quotas.
-   Supersede or invalidate the previous challenge safely.
-   Generate a fresh OTP and challenge.
-   Do not reset abuse counters in a way that permits unlimited
    guessing.
-   Handle provider timeouts and delivery failures.
-   Avoid duplicate SMS sends on retried requests; use idempotency where
    appropriate.
-   Do not expose OTP values in API responses or logs.

### 4.4 OTP security policy

Make the following configurable and environment-specific:

  Setting                                      Suggested starting value
  ------------------------------- -------------------------------------
  OTP lifetime                                                5 minutes
  Maximum verification attempts                                       5
  Resend cooldown                                        30--60 seconds
  OTP length                                                   6 digits
  Access-token lifetime                                  10--15 minutes
  Refresh-token lifetime            7--30 days, based on product policy

These are starting values, not universal security guarantees. Confirm
SMS-provider constraints and business requirements.

Security requirements:

-   Use Node.js `crypto` secure random generation; never use
    `Math.random()`.
-   Store an HMAC/digest of the OTP using a server-side secret kept
    outside the database. Use a per-challenge salt/context and
    constant-time comparison.
-   Never store plaintext OTPs.
-   Never log OTPs or include them in analytics, traces, crash reports,
    or error messages.
-   OTP must be single-use and bound to purpose, destination, challenge,
    and expiry.
-   Prevent replay and concurrent double verification using
    transactions, conditional updates, row locks, or another proven
    atomic strategy.
-   Invalidate or supersede earlier active challenges according to a
    documented policy.
-   Keep attempt counters durable across application restarts.
-   Use distributed rate limiting in multi-instance deployments;
    in-memory limits alone are insufficient.
-   Consider SMS pumping, number enumeration, bot abuse, SIM-swap risk,
    and provider spend limits.
-   Do not lock a victim's number indefinitely based only on
    unauthenticated requests. Use progressive throttling and abuse
    controls that reduce denial-of-service risk.
-   Return generic errors such as "Invalid or expired verification code"
    rather than exposing whether the code was wrong, expired, or already
    consumed where that distinction is not required by the client.

### 4.5 Access tokens and refresh tokens

Access token:

-   Sign using a strong, explicitly configured algorithm and securely
    managed key/secret.
-   Validate signature, issuer, audience, expiry, and allowed algorithm.
-   Use short expiry.
-   Include only necessary claims, such as subject/user ID, session ID,
    issued-at, expiry, issuer, audience, and minimal authorization
    claims.
-   Do not put birth details, mobile number, email, or other unnecessary
    PII in JWT claims.
-   Do not accept unsigned tokens or algorithm confusion.
-   Document key rotation and secret rotation.

Refresh token:

-   Generate a high-entropy opaque random token using a cryptographic
    random generator.
-   Store only a cryptographic hash/digest of the refresh token.
-   Bind it to a session/device record and expiry.
-   Rotate it on every successful refresh.
-   Revoke the old token atomically.
-   Detect reuse of a rotated/revoked token and revoke the affected
    token family/session according to a documented policy.
-   Protect against concurrent refresh races.
-   Support logout of current session and logout from all sessions.
-   Never put refresh tokens in URLs or logs.
-   For mobile clients, document secure storage using Android
    Keystore-backed storage and iOS Keychain. Avoid browser-style local
    storage assumptions.

If JWT access tokens are stateless, explain the effect of
logout/revocation before access-token expiry. Use short access-token
lifetimes and, if immediate revocation is required, a session/version
check or denylist strategy with an explicit performance trade-off.

### 4.6 Profile management

Implement:

-   Get current user's profile.
-   Create or complete profile.
-   Update profile.
-   Update profile photo using a secure upload strategy or pre-signed
    object-storage URL.
-   Initiate and verify email ownership if email verification is
    included.
-   Initiate and verify mobile-number change.
-   Return profile completion status.

Suggested profile fields:

-   User ID
-   Full name
-   Display name
-   Verified mobile number and country code
-   Email and email verification status
-   Gender (optional; only collect if product requires it)
-   Date of birth (only if needed for general profile; otherwise keep
    astrology birth date separate)
-   Profile photo reference/URL
-   Preferred language
-   Country, state, city
-   Timezone
-   Profile completion status
-   Created and updated timestamps

Use explicit allowlists for writable fields. Never bind request bodies
directly to database models. Do not allow clients to modify user ID,
roles, verification flags, account status, created timestamps, or other
server-controlled properties.

For every profile endpoint, derive the user identity from the validated
authentication context. Never trust a user ID supplied by the client to
decide whose profile is accessed. If an administrative endpoint is later
added, implement explicit role and object-level authorization.

### 4.7 Mobile-number change

-   Require an authenticated session and, where appropriate, recent
    re-authentication.
-   Initiate verification for the new number.
-   Verify ownership of the new number before changing it.
-   Prevent a number already assigned to another account from being
    claimed.
-   Apply OTP throttling and audit the change.
-   Notify the old number/email when appropriate.
-   Rotate/revoke sessions according to the risk policy.
-   Perform the number update and verification consumption atomically.

### 4.8 Astrology birth details

Keep astrology-specific data in a separate entity/table.

Suggested fields:

-   User ID
-   Birth date
-   Birth time (nullable)
-   Birth time accuracy: exact, approximate, unknown
-   Birthplace name
-   Latitude
-   Longitude
-   IANA timezone identifier
-   Created timestamp
-   Updated timestamp

Requirements:

-   Birth time may be unknown; never silently assume midnight.
-   Validate date and coordinates.
-   Validate timezone against an IANA timezone database.
-   Preserve the user's entered local birth date/time and timezone
    semantics.
-   Handle daylight-saving transitions and ambiguous/nonexistent local
    times explicitly.
-   Do not infer timezone from coordinates without a reliable
    geocoding/timezone source.
-   Keep birth data private and return it only to the authorized user or
    explicitly authorized service.
-   Record purpose and consent for collecting astrology-related personal
    data.
-   Define whether birth date is duplicated in the general profile;
    avoid inconsistent copies.

### 4.9 Logout and account lifecycle

Implement:

-   Logout current session.
-   Logout all sessions.
-   Revoke refresh-token family.
-   Deactivate account.
-   Submit account deletion request.
-   Track deletion request status and completion.
-   Apply retention, legal hold, backup expiry, and audit retention
    policies.
-   Prevent deactivated/deletion-completed accounts from authenticating.
-   Revoke active sessions during deactivation/deletion according to
    policy.

Do not claim that data is instantly erased from backups if the actual
retention process does not support that.

## 5. Proposed API inventory

Use `/api/v1/` versioned routes. Adjust names consistently if the final
API convention differs.

### Authentication

  ----------------------------------------------------------------------------------
  Method                  Endpoint                           Purpose
  ----------------------- ---------------------------------- -----------------------
  POST                    `/api/v1/auth/signup/initiate`     Start signup OTP flow

  POST                    `/api/v1/auth/signup/verify-otp`   Verify signup OTP and
                                                             create account

  POST                    `/api/v1/auth/login/initiate`      Start login OTP flow

  POST                    `/api/v1/auth/login/verify-otp`    Verify login OTP and
                                                             create session

  POST                    `/api/v1/auth/otp/resend`          Resend OTP

  POST                    `/api/v1/auth/token/refresh`       Rotate refresh token

  POST                    `/api/v1/auth/logout`              Logout current session

  POST                    `/api/v1/auth/logout-all`          Revoke all sessions
  ----------------------------------------------------------------------------------

### User profile

  ------------------------------------------------------------------------------------------------
  Method                  Endpoint                                         Purpose
  ----------------------- ------------------------------------------------ -----------------------
  GET                     `/api/v1/users/me`                               Get own profile

  PUT                     `/api/v1/users/me`                               Replace/update allowed
                                                                           profile fields

  PATCH                   `/api/v1/users/me`                               Partially update
                                                                           allowed profile fields

  POST                    `/api/v1/users/me/profile-photo`                 Initiate or complete
                                                                           profile-photo upload

  POST                    `/api/v1/users/me/email/verification/initiate`   Start email
                                                                           verification

  POST                    `/api/v1/users/me/email/verification/confirm`    Confirm email
                                                                           verification

  POST                    `/api/v1/users/me/mobile/change/initiate`        Start new mobile
                                                                           verification

  POST                    `/api/v1/users/me/mobile/change/confirm`         Confirm mobile change
  ------------------------------------------------------------------------------------------------

### Astrology birth details

  ----------------------------------------------------------------------------------
  Method                  Endpoint                           Purpose
  ----------------------- ---------------------------------- -----------------------
  GET                     `/api/v1/users/me/birth-details`   Get own birth details

  PUT                     `/api/v1/users/me/birth-details`   Create/update own birth
                                                             details
  ----------------------------------------------------------------------------------

### Account lifecycle

  ----------------------------------------------------------------------------------------------
  Method                  Endpoint                                       Purpose
  ----------------------- ---------------------------------------------- -----------------------
  POST                    `/api/v1/users/me/deactivate`                  Deactivate account

  POST                    `/api/v1/users/me/deletion-requests`           Submit deletion request

  GET                     `/api/v1/users/me/deletion-requests/current`   Check deletion request
                                                                         status, if required
  ----------------------------------------------------------------------------------------------

For every endpoint specify:

-   Authentication requirement.
-   Authorization rule.
-   Request schema.
-   Response schema.
-   Validation rules.
-   Status codes.
-   Rate limit.
-   Idempotency behavior.
-   Audit events.
-   Relevant tests.

Do not add unnecessary endpoints merely to match this list. Explain any
change.

## 6. Database design

Use PostgreSQL and Prisma. Create normalized tables/models for at least:

1.  `User`
2.  `UserProfile`
3.  `UserBirthDetails`
4.  `OtpChallenge` or `OtpVerification`
5.  `RefreshToken` or `Session`
6.  `UserDevice` (only if required by product needs)
7.  `UserConsent`
8.  `AuditLog`
9.  `AccountDeletionRequest` (if deletion workflow is implemented)

Database requirements:

-   Use UUIDs or another consistently selected non-guessable identifier
    strategy for externally exposed IDs.
-   Use primary keys, foreign keys, unique constraints, check
    constraints where useful, and appropriate indexes.
-   Enforce unique normalized mobile numbers at database level.
-   Use transactions for signup verification/account creation/session
    issuance, refresh rotation, mobile change, and other critical state
    transitions.
-   Use optimistic or pessimistic concurrency controls where needed.
-   Store only OTP HMAC/digest, not plaintext OTP.
-   Store only refresh-token hashes, not plaintext refresh tokens.
-   Use `timestamptz` for instants and UTC handling.
-   Model birth local time/timezone deliberately; document the
    representation.
-   Define deletion behavior explicitly; do not blindly cascade-delete
    audit or legal-retention records.
-   Add migration and rollback guidance.
-   Include development-only seed data; never seed real user data or
    production credentials.

Deliver:

-   ER diagram in Mermaid.
-   Prisma schema.
-   Migration files or migration commands.
-   Index/constraint explanation.
-   Sample development seed script.
-   Backup and restore considerations.

## 7. API response and error contract

Use one consistent response envelope, unless the team has an established
standard.

Example success:

``` json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "errors": [],
  "traceId": "correlation-id"
}
```

Example validation/error response:

``` json
{
  "success": false,
  "message": "Request could not be processed",
  "data": null,
  "errors": [
    {
      "code": "INVALID_OR_EXPIRED_OTP",
      "field": "otp",
      "message": "Invalid or expired verification code"
    }
  ],
  "traceId": "correlation-id"
}
```

Use appropriate HTTP status codes:

-   200: Successful request.
-   201: Resource created.
-   202: Accepted for asynchronous processing.
-   204: Successful operation with no response body.
-   400: Invalid request or validation failure.
-   401: Missing or invalid authentication.
-   403: Authenticated but not authorized.
-   404: Resource not found, where disclosure is safe.
-   409: State or uniqueness conflict.
-   413: Payload too large.
-   415: Unsupported media type.
-   422: Semantically invalid input, if used consistently.
-   429: Rate limit exceeded.
-   500: Unexpected server error.
-   502/503/504: Upstream/provider or service availability failures
    where appropriate.

Never expose stack traces, SQL text, internal paths, secrets, OTPs,
token values, or sensitive provider responses.

## 8. Standard functional and QA test coverage

Create a test-case document and automated tests. Every test case must
include:

-   Test case ID.
-   Module.
-   Scenario/title.
-   Preconditions.
-   Test data.
-   Steps.
-   Expected result.
-   Actual result (blank until execution).
-   Pass/fail (blank until execution).
-   Priority.
-   Test type.
-   Automation status.

Do not claim tests passed unless they were actually executed.
Distinguish planned tests from executed tests.

### 8.1 Signup tests

-   Valid new mobile number.
-   Invalid number format.
-   Missing number.
-   Missing/invalid country calling code.
-   Unsupported country.
-   Number normalization to E.164.
-   Existing registered number.
-   Repeated signup initiation.
-   OTP successfully generated.
-   SMS provider success.
-   SMS provider failure/timeout.
-   Invalid challenge ID.
-   Missing OTP.
-   Incorrect OTP.
-   OTP with wrong length or non-numeric characters.
-   Expired OTP.
-   OTP already consumed.
-   OTP superseded by resend.
-   Maximum attempt reached.
-   Concurrent verification requests.
-   Concurrent signup attempts for same number.
-   Unique constraint prevents duplicate account.
-   Database failure during signup transaction.
-   Transaction rollback leaves no partial user/session.
-   Retry/idempotency behavior.
-   Generic response prevents account enumeration.

### 8.2 Login tests

-   Registered active number.
-   Unregistered number.
-   Valid OTP.
-   Incorrect OTP.
-   Expired OTP.
-   Reused OTP.
-   Invalid challenge.
-   Maximum failed attempts.
-   Rate-limited login.
-   Deactivated account.
-   Deletion-pending account.
-   Blocked account.
-   SMS provider timeout.
-   Database unavailable.
-   Concurrent login attempts.
-   Login from multiple devices.
-   Response contains no unnecessary PII or secrets.
-   Account enumeration behavior is consistent.

### 8.3 OTP abuse/security tests

-   Brute-force guessing.
-   OTP replay.
-   OTP enumeration.
-   Resend flooding.
-   Cooldown bypass.
-   Attempt-counter reset bypass.
-   Parallel verification race.
-   OTP challenge substitution.
-   Purpose substitution (signup OTP used for login or mobile change).
-   Destination substitution.
-   Expiry boundary conditions.
-   OTP digest comparison.
-   Database dump does not reveal OTP.
-   Logs/traces do not contain OTP.
-   Rate-limit bypass using changing IPs/device identifiers.
-   SMS pumping and unusual spend patterns.
-   Provider failure/retry does not create duplicate sends.
-   Distributed rate limit works across multiple app instances.
-   Victim lockout/denial-of-service resilience.

### 8.4 JWT/session tests

-   Valid access token.
-   Missing token.
-   Malformed token.
-   Tampered signature.
-   Expired token.
-   Wrong issuer.
-   Wrong audience.
-   Unsupported algorithm.
-   Algorithm confusion/none algorithm.
-   Missing required claims.
-   Token from another environment.
-   Refresh token rotation.
-   Old refresh token rejected.
-   Reuse detection.
-   Refresh token expired.
-   Refresh token revoked.
-   Refresh token hash at rest.
-   Concurrent refresh requests.
-   Logout current session.
-   Logout all sessions.
-   Revocation behavior before access-token expiry.
-   Session/device association.
-   Key/secret rotation procedure.

### 8.5 Profile tests

-   Get profile with valid access token.
-   Get profile without token.
-   Update allowed fields.
-   Empty body.
-   Invalid email.
-   Excessively long values.
-   Invalid Unicode/encoding.
-   Invalid date.
-   HTML/script payload.
-   SQL injection payload.
-   Mass assignment attempt.
-   Attempt to update user ID.
-   Attempt to update role.
-   Attempt to change verification/account status.
-   Attempt to read or update another user's profile.
-   Mobile change without verification.
-   Mobile change with valid verification.
-   Duplicate mobile number.
-   Concurrent profile update.
-   Profile-photo file type validation.
-   Oversized upload.
-   Spoofed MIME type.
-   Malicious filename/path traversal.
-   Image decompression/resource exhaustion.
-   Storage-provider failure.
-   Database update failure.
-   Response does not expose private fields.

### 8.6 Birth-details tests

-   Valid birth date/time.
-   Unknown birth time.
-   Approximate birth time.
-   Missing optional birth time.
-   Future birth date.
-   Invalid date format.
-   Leap-day cases.
-   Invalid latitude/longitude.
-   Boundary coordinates.
-   Invalid timezone.
-   Daylight-saving transition.
-   Ambiguous/nonexistent local time.
-   Birthplace missing.
-   Very long birthplace.
-   Unauthorized access to another user's birth details.
-   Update and persistence.
-   Consent handling.
-   No silent conversion of unknown time to midnight.

### 8.7 Logout/account lifecycle tests

-   Logout current session.
-   Logout with invalid/revoked refresh token.
-   Logout all devices.
-   Reuse token after logout.
-   Deactivate account.
-   Login after deactivation.
-   Deletion request submission.
-   Duplicate deletion request.
-   Cancellation policy, if supported.
-   Deletion processing and retention policy.
-   Audit record creation.
-   Session revocation during deactivation/deletion.

### 8.8 Integration, resilience, and performance tests

-   PostgreSQL unavailable.
-   Redis unavailable.
-   SMS provider timeout/failure.
-   Network interruption.
-   Database transaction rollback.
-   Application restart during OTP workflow.
-   Multiple API instances.
-   Duplicate/retried requests.
-   Slow database query.
-   Connection pool exhaustion.
-   Provider retry/backoff.
-   Graceful shutdown.
-   Health/readiness endpoints.
-   Load and stress testing for OTP and login endpoints.
-   Rate-limit correctness under load.
-   No sensitive data in health checks or metrics.

## 9. VAPT and application security requirements

Act as an independent application security reviewer. Map findings to the
relevant OWASP controls and provide evidence. Use current official
versions at implementation time; do not assume a checklist alone proves
compliance.

Reference baselines:

-   OWASP API Security Top 10 (2023).
-   OWASP ASVS (use current stable version).
-   OWASP Web Security Testing Guide.
-   OWASP MASVS for mobile application integration.
-   Relevant Node.js and Express security guidance.

Perform authorized testing only against systems owned by the
organization or where explicit written permission exists.

### 9.1 Authentication and authorization

Test for:

-   Broken authentication.
-   Weak OTP generation/storage/verification.
-   Brute force and credential guessing.
-   Account enumeration.
-   JWT signature/claim validation weaknesses.
-   Refresh token theft, replay, and rotation failure.
-   Missing authentication.
-   Broken object-level authorization (BOLA).
-   IDOR.
-   Broken function-level authorization.
-   Privilege escalation.
-   Session fixation or weak session lifecycle.
-   Cross-user access to profile/birth data.
-   Trusting user IDs or roles supplied by clients.

### 9.2 Input validation and injection

Test for:

-   SQL injection.
-   NoSQL injection if any NoSQL service is added.
-   XSS in stored/reflected profile fields and downstream admin
    interfaces.
-   Command injection.
-   Header injection/CRLF.
-   JSON/parser edge cases.
-   Parameter pollution.
-   Mass assignment.
-   Path traversal.
-   Malformed JSON.
-   Unexpected content types.
-   Unicode and normalization attacks.
-   Oversized payloads and resource exhaustion.

Use parameterized ORM/database operations. Do not rely on input
filtering as the sole injection defense.

### 9.3 API and business-logic security

Test for:

-   Missing/weak rate limiting.
-   Unrestricted sensitive business flows.
-   Excessive data exposure.
-   Improper asset/property-level authorization.
-   CORS misconfiguration.
-   HTTP method tampering.
-   Missing request size limits.
-   Unsafe error handling.
-   Debug/diagnostic endpoint exposure.
-   Swagger exposure or weak access controls in production.
-   Insecure HTTP/TLS configuration.
-   Weak cache directives on sensitive responses.
-   Missing idempotency or race-condition protections.
-   SMS pumping and provider cost abuse.
-   Abuse of account deletion/deactivation workflows.

### 9.4 Data protection and privacy

Verify:

-   HTTPS/TLS enforcement.
-   Secure secrets management.
-   OTP HMAC key protection and rotation.
-   Refresh-token hash storage.
-   Encryption at rest where appropriate.
-   Restricted database network access.
-   Least-privilege database account.
-   PII minimization.
-   PII masking in logs.
-   No tokens/OTP in logs, URLs, traces, analytics, or crash reports.
-   Backup encryption and access controls.
-   Data retention/deletion policy.
-   Audit log integrity and restricted access.
-   Consent capture and purpose limitation.
-   No sensitive birth data in JWT claims.

### 9.5 Mobile-client security integration

Verify:

-   No API secrets embedded in Android/iOS binaries.
-   Access/refresh tokens stored using platform secure storage.
-   TLS certificate validation is enabled.
-   No reliance on client-side validation alone.
-   User identity is derived from server-validated credentials.
-   Device ID is not treated as proof of identity.
-   Tokens are not exposed in logs, clipboard, deep links, or analytics.
-   App backgrounding and logout behavior are considered.
-   API remains secure if the mobile app is reverse engineered.
-   Certificate pinning, if used, has a safe certificate/key rotation
    and recovery strategy; do not treat pinning as a replacement for TLS
    validation.

### 9.6 Infrastructure and supply-chain security

Verify:

-   Secrets are not committed to source control.
-   Production environment variables/secrets use a secrets manager.
-   PostgreSQL is not publicly exposed unnecessarily.
-   Redis is authenticated and network-restricted.
-   Docker runs as non-root where practical.
-   Containers use minimal trusted base images.
-   No unnecessary ports are exposed.
-   Dependencies are scanned and updated.
-   SAST, dependency scanning, and container scanning are in CI.
-   TLS configuration is secure.
-   Backups are encrypted and restore-tested.
-   Logs/metrics are access-controlled.
-   Production debug mode is disabled.
-   Security patches and incident response procedures exist.

## 10. VAPT report deliverable

Create a report template with:

-   Finding ID.
-   Finding title.
-   Affected endpoint/component.
-   OWASP mapping.
-   Severity: Critical / High / Medium / Low / Informational.
-   CVSS score and CVSS version, if scoring is appropriate.
-   Preconditions.
-   Description.
-   Reproduction steps.
-   Safe proof of concept.
-   Expected secure behavior.
-   Actual behavior.
-   Business impact.
-   Evidence reference (redacted).
-   Root cause.
-   Recommended remediation.
-   Retest steps.
-   Retest status.
-   Owner and target date.

Do not fabricate vulnerabilities, CVSS scores, evidence, or test
results. Mark untested items as "Not tested" and remediated items as
"Pending retest" until verified.

## 11. API documentation and Postman

Generate OpenAPI 3.x documentation for all endpoints.

For every endpoint document:

-   Summary and purpose.
-   Authentication and authorization.
-   Request headers.
-   Path/query parameters.
-   Request body schema.
-   Validation rules.
-   Success response.
-   Error responses.
-   Rate limits.
-   Idempotency behavior.
-   Example requests/responses.

Create a Postman collection with:

-   Signup initiation and OTP verification.
-   Login initiation and OTP verification.
-   OTP resend.
-   Refresh token rotation.
-   Logout and logout all.
-   Get/update profile.
-   Mobile change.
-   Birth-details get/update.
-   Deactivation/deletion request.
-   Positive and negative examples.
-   Environment variables for base URL and tokens.
-   Scripts to store test tokens safely within the local test
    environment.
-   No real production secrets or OTP values.

If the SMS provider is mocked in local/test environments, clearly
document how test OTP delivery is captured without exposing OTPs in
production.

## 12. Observability and operational readiness

Implement:

-   Structured JSON logs.
-   Correlation/request ID.
-   Redaction of PII, OTPs, tokens, authorization headers, and secrets.
-   Metrics for request counts, latency, errors, OTP send outcomes,
    throttling, and provider failures without high-cardinality PII
    labels.
-   Health and readiness checks that reveal no secrets.
-   Graceful shutdown.
-   Database connection pool configuration.
-   Timeouts for upstream SMS provider calls.
-   Retry with bounded backoff only where safe.
-   Alerts for unusual OTP/SMS spend, repeated failures, and abuse
    patterns.
-   Audit events for authentication, session changes, profile changes,
    mobile changes, consent, and account lifecycle events.

## 13. Environment configuration

Provide `.env.example` with placeholder values only. Validate all
required variables at application startup and fail safely if required
production configuration is missing.

Include suitable variables such as:

``` dotenv
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/astrology_db
REDIS_URL=redis://localhost:6379
JWT_ISSUER=astrology-api
JWT_AUDIENCE=astrology-mobile
JWT_ACCESS_TOKEN_TTL=15m
JWT_SIGNING_KEY_SECRET_REFERENCE=configure-in-secret-manager
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_HMAC_SECRET_REFERENCE=configure-in-secret-manager
SMS_PROVIDER=mock
SMS_PROVIDER_API_KEY_SECRET_REFERENCE=configure-in-secret-manager
LOG_LEVEL=info
```

These are illustrative names. Implement actual configuration safely. Do
not place real secrets in `.env.example`, source control, Docker images,
or logs. Explain development versus staging versus production
configuration.

## 14. Development phases and approval gates

Execute the work in the following order. At the end of each phase,
present deliverables, commands, tests, known gaps, and a completion
checklist. Wait for explicit approval before proceeding.

### Phase 1 -- Requirement analysis and architecture

-   Clarify mobile app behavior and signup/login policy.
-   Define user/account states.
-   Define OTP purpose and challenge lifecycle.
-   Define API contracts.
-   Define session and token policies.
-   Produce architecture diagram and sequence diagrams.
-   Identify assumptions, risks, and open questions.

### Phase 2 -- Database design

-   Produce Mermaid ER diagram.
-   Design Prisma schema.
-   Define constraints, indexes, relationships, and deletion behavior.
-   Define OTP/session concurrency strategy.
-   Produce migration plan.

### Phase 3 -- Project bootstrap

-   Create Node.js/Express/TypeScript project.
-   Configure strict TypeScript, linting, formatting, and scripts.
-   Configure Prisma/PostgreSQL.
-   Configure Redis integration if used.
-   Add environment validation.
-   Add centralized error handling, logging, and request IDs.
-   Add Docker development setup.
-   Add health/readiness endpoints.

### Phase 4 -- OTP and SMS provider foundation

-   Define SMS provider interface/adapter.
-   Implement mock provider for tests.
-   Implement chosen provider adapter after credentials/provider are
    selected.
-   Implement OTP generation and keyed digest.
-   Implement challenge persistence, expiry, attempt count, and resend
    policy.
-   Implement rate limiting and provider-failure handling.
-   Add unit/integration tests.

### Phase 5 -- Signup APIs

-   Implement signup initiation.
-   Implement OTP verification.
-   Create user and session transactionally.
-   Enforce unique mobile number.
-   Add idempotency/concurrency protection.
-   Add API documentation and tests.

### Phase 6 -- Login APIs

-   Implement login initiation and OTP verification.
-   Handle account states securely.
-   Add anti-enumeration behavior.
-   Add rate limiting and abuse monitoring.
-   Add tests.

### Phase 7 -- JWT and refresh-token lifecycle

-   Implement access-token signing/verification.
-   Implement opaque refresh tokens and hashed storage.
-   Implement refresh rotation and reuse detection.
-   Implement concurrent refresh handling.
-   Implement key rotation guidance.
-   Add tests.

### Phase 8 -- Logout and session management

-   Implement current-session logout.
-   Implement logout-all.
-   Implement session listing/revocation only if product requires it.
-   Test token revocation and session state.

### Phase 9 -- User profile

-   Implement get/create/update profile.
-   Implement field allowlists and validation.
-   Implement secure photo-upload design.
-   Implement optional email verification.
-   Test BOLA/mass assignment and privacy.

### Phase 10 -- Astrology birth details

-   Implement separate birth-details model and APIs.
-   Validate timezone, coordinates, date/time, and accuracy.
-   Implement consent handling.
-   Test daylight-saving and unknown-time cases.

### Phase 11 -- Mobile-number change and account lifecycle

-   Implement new-number verification.
-   Implement deactivation and deletion request.
-   Implement notifications/audit events.
-   Test session revocation and retention rules.

### Phase 12 -- Automated QA

-   Complete unit tests.
-   Complete integration tests.
-   Add negative, boundary, concurrency, and failure tests.
-   Produce test case matrix and coverage report.
-   Report actual execution results only.

### Phase 13 -- OpenAPI and Postman

-   Generate Swagger/OpenAPI.
-   Generate Postman collection and environments.
-   Validate examples against running API.
-   Document local test OTP mechanism.

### Phase 14 -- VAPT and remediation

-   Run static/dependency/container scans.
-   Run authorized DAST and manual API security tests.
-   Test BOLA, authentication, OTP abuse, injection, rate limiting, data
    exposure, and business logic.
-   Produce VAPT report.
-   Fix findings and perform retests.
-   Do not claim certification or compliance solely from checklist
    completion.

### Phase 15 -- Performance and production readiness

-   Load-test critical endpoints.
-   Review PostgreSQL indexes and connection pool.
-   Validate Redis/distributed throttling.
-   Review logs, metrics, alerts, backups, and restore.
-   Review deployment, TLS, secrets, firewall, and rollback.
-   Produce production go-live checklist.

## 15. Required output for every implementation phase

For every phase, provide:

1.  Objective and scope.
2.  Assumptions and decisions.
3.  Architecture/design explanation.
4.  Mermaid diagram where useful.
5.  Exact folder and file paths.
6.  Complete code for every new/changed file.
7.  Prisma schema/migration changes where relevant.
8.  Installation and run commands.
9.  API request and response examples.
10. Unit and integration tests.
11. Security implications and controls.
12. Swagger/OpenAPI updates.
13. Postman updates where relevant.
14. Known limitations and outstanding questions.
15. Completion checklist.

Before moving to the next phase, ask for approval.

When working in an existing repository, inspect its current structure
and conventions first. Do not overwrite existing files or replace
working architecture without explaining the impact. Reuse existing
patterns where sound.

## 16. Definition of done

The module is ready for release only when:

-   Signup and login work end to end using the selected SMS provider.
-   OTPs are secure, short-lived, single-use, and abuse-limited.
-   Concurrent requests cannot create duplicate users or consume one OTP
    multiple times.
-   Access and refresh tokens follow the documented lifecycle.
-   Logout and revocation behavior is understood and tested.
-   Users can access and update only their own profile and birth
    details.
-   Mobile-number changes require proof of control of the new number.
-   Database constraints and migrations are in place.
-   Functional, negative, integration, and concurrency tests have been
    executed.
-   API documentation and Postman collection are available.
-   Security tests have been performed in an authorized environment.
-   Findings are fixed or explicitly risk-accepted, with retest status
    recorded.
-   Secrets, logs, backups, infrastructure, and deployment have been
    reviewed.
-   No test result or security claim is fabricated.

## 17. Start instruction

Start with **Phase 1 -- Requirement Analysis and Architecture Design**.

First inspect any existing repository and identify existing conventions.
If no repository is available, propose the project structure.

Ask only essential questions that block a sound architecture decision.
Otherwise, state reasonable assumptions clearly and present them for
approval.

Do not start generating implementation code until Phase 1 architecture
and decisions have been reviewed and approved.

**Final objective:** Deliver a secure, maintainable, scalable,
production-ready Node.js + TypeScript + Express + PostgreSQL backend for
astrology mobile-app signup, OTP login, user profile, and birth details,
supported by comprehensive automated tests, API documentation, and an
evidence-based VAPT process.

------------------------------------------------------------------------

# Appendix A -- Quick API workflow

## New-user signup

``` mermaid
sequenceDiagram
    participant App as Android/iOS App
    participant API as Node.js API
    participant DB as PostgreSQL
    participant SMS as SMS Provider

    App->>API: POST signup/initiate (mobile)
    API->>DB: Create OTP challenge (digest only)
    API->>SMS: Send OTP
    SMS-->>API: Delivery result
    API-->>App: Generic success + challengeId
    App->>API: POST signup/verify-otp
    API->>DB: Verify and consume challenge atomically
    API->>DB: Create user and session transactionally
    API-->>App: User summary + access/refresh tokens
```

## Existing-user login

``` mermaid
sequenceDiagram
    participant App as Android/iOS App
    participant API as Node.js API
    participant DB as PostgreSQL
    participant SMS as SMS Provider

    App->>API: POST login/initiate (mobile)
    API->>DB: Create OTP challenge
    API->>SMS: Send OTP
    SMS-->>API: Delivery result
    API-->>App: Generic success + challengeId
    App->>API: POST login/verify-otp
    API->>DB: Verify challenge and account state
    API->>DB: Consume challenge and create session
    API-->>App: User summary + access/refresh tokens
```

# Appendix B -- Suggested initial test-case IDs

  -----------------------------------------------------------------------
  Test ID                 Scenario                Expected result
  ----------------------- ----------------------- -----------------------
  AUTH-SU-001             Signup with valid new   OTP challenge initiated
                          number                  

  AUTH-SU-002             Signup with malformed   Validation error
                          number                  

  AUTH-SU-003             Signup with existing    Generic, documented
                          number                  response

  AUTH-OTP-001            Verify correct OTP      Challenge consumed once

  AUTH-OTP-002            Verify incorrect OTP    Rejected and attempt
                                                  count incremented

  AUTH-OTP-003            Verify expired OTP      Rejected

  AUTH-OTP-004            Replay consumed OTP     Rejected

  AUTH-OTP-005            Exceed attempt limit    Further attempts
                                                  throttled/blocked

  AUTH-OTP-006            Concurrent OTP          At most one succeeds
                          verification            

  AUTH-LOGIN-001          Login with valid OTP    Session and tokens
                                                  issued

  AUTH-LOGIN-002          Login with inactive     Authentication denied
                          account                 safely

  AUTH-TOKEN-001          Refresh valid token     New token pair/rotation
                                                  result

  AUTH-TOKEN-002          Reuse old refresh token Reuse detected and
                                                  policy applied

  AUTH-TOKEN-003          Refresh revoked token   Rejected

  AUTH-LOGOUT-001         Logout current session  Refresh session revoked

  USER-PROF-001           Get own profile         Own profile returned

  USER-PROF-002           Update allowed fields   Changes persisted

  USER-PROF-003           Mass assignment of role Privileged field
                                                  unchanged

  USER-PROF-004           Access another user's   Denied/not disclosed
                          profile                 

  USER-MOB-001            Change mobile without   Rejected
                          OTP                     

  USER-MOB-002            Change mobile with      Number updated
                          verified OTP            atomically

  ASTRO-BD-001            Save valid birth        Details persisted
                          details                 

  ASTRO-BD-002            Save unknown birth time Unknown remains unknown

  ASTRO-BD-003            Invalid                 Validation error
                          timezone/coordinates    

  SEC-BOLA-001            Change resource ID to   Access denied
                          another user            

  SEC-RATE-001            Exceed OTP initiation   HTTP 429 or documented
                          limit                   throttle response

  SEC-LOG-001             Inspect logs for        No secrets present
                          OTP/token               
  -----------------------------------------------------------------------

# Appendix C -- Go-live security checklist

-   [ ] HTTPS enforced at ingress and upstream.
-   [ ] Production secrets held in a secrets manager.
-   [ ] No real secrets in Git, images, or CI logs.
-   [ ] OTP digest/HMAC design reviewed.
-   [ ] OTP expiry, attempts, resend and distributed rate limits
    verified.
-   [ ] SMS provider quotas and spend alerts configured.
-   [ ] Refresh-token hashes and rotation verified.
-   [ ] BOLA/IDOR tests executed with multiple users.
-   [ ] Mass-assignment tests executed.
-   [ ] Sensitive response fields reviewed.
-   [ ] PII/OTP/token log redaction verified.
-   [ ] PostgreSQL and Redis network access restricted.
-   [ ] Database least-privilege account configured.
-   [ ] Backups encrypted and restore-tested.
-   [ ] Dependency and container scans reviewed.
-   [ ] Production debug mode disabled.
-   [ ] Swagger access policy configured.
-   [ ] Rate limits and payload size limits configured.
-   [ ] Monitoring and security alerts configured.
-   [ ] VAPT findings retested or formally risk-accepted.
-   [ ] Rollback and incident-response procedures documented.
