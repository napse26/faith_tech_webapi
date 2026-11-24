# Astrology App – Customer Management API Specification

> **Scope:** Customer/user management APIs for the existing astrology application.
>
> **Out of scope:** Technology stack, application architecture, and OTP-based signup/sign-in (already implemented). OTP may be reused for sensitive verification workflows such as mobile-number changes.

## 1. Goals

Secure APIs for authenticated customers to:
- View and update their profile.
- Maintain multiple birth profiles (self and family members).
- Verify/change contact details.
- Manage preferences and notification settings.
- Review and revoke sessions/devices.
- Manage consent and privacy.
- Deactivate, reactivate, or request account deletion.
- Optionally manage support requests, astrologer favorites, and recent activity.

## 2. API conventions

- Base path: `/api/v1`
- JSON request/response unless specified otherwise.
- Authentication required for all `/customers/me/*` routes.
- Derive customer identity from authenticated token/session; never trust a client-supplied customer ID for “me” endpoints.
- Use `PATCH` for partial updates and `PUT` for full replacement where appropriate.
- Paginate collection endpoints.
- Use UTC ISO-8601 timestamps.
- Use a consistent error format (recommended RFC 7807 Problem Details).
- Use idempotency keys where retries could create duplicate resources/requests.
- Apply validation, ownership checks, audit logging for sensitive actions, and rate limits.

## 3. Core customer profile

### 3.1 Get profile
**GET** `/api/v1/customers/me`

Example response:
```json
{
  "success": true,
  "data": {
    "customerId": "cus_123",
    "fullName": "Sunil Kumar",
    "email": "sunil@example.com",
    "mobileNumber": "+919876543210",
    "mobileVerified": true,
    "emailVerified": false,
    "profilePhotoUrl": null,
    "dateOfBirth": "1990-01-15",
    "gender": "MALE",
    "preferredLanguage": "en",
    "accountStatus": "ACTIVE",
    "profileCompletionPercentage": 80,
    "createdAt": "2026-01-01T10:00:00Z",
    "updatedAt": "2026-01-01T10:00:00Z"
  }
}
```

### 3.2 Update profile
**PATCH** `/api/v1/customers/me`

Example request:
```json
{
  "fullName": "Sunil Kumar",
  "email": "sunil@example.com",
  "dateOfBirth": "1990-01-15",
  "gender": "MALE",
  "preferredLanguage": "hi"
}
```
Rules:
- Allowlist editable fields; never allow customer ID, role, status, verification flags, internal fields, or audit timestamps.
- Email change resets verification status and requires verification.
- Validate DOB, gender enum, language codes, and lengths.

### 3.3 Status/profile completion
**GET** `/api/v1/customers/me/status`

Example:
```json
{
  "success": true,
  "data": {
    "accountStatus": "ACTIVE",
    "profileCompletionPercentage": 80,
    "missingFields": ["email", "birthProfile"],
    "canUseAstrologyServices": true
  }
}
```

### 3.4 Profile photo
- **POST** `/api/v1/customers/me/profile-photo` — upload (multipart/form-data).
- **DELETE** `/api/v1/customers/me/profile-photo` — remove.

Upload requirements: approved image types, file-size/dimension limits, validate file contents (not only MIME/extension), safe storage names, scan where supported, and return a photo URL/resource reference.

## 4. Birth profiles (essential astrology feature)

Customers can save multiple birth profiles for themselves and family. Future Kundli/horoscope/compatibility/matchmaking APIs should use `birthProfileId` rather than resend birth details.

### 4.1 List
**GET** `/api/v1/customers/me/birth-profiles`

### 4.2 Create
**POST** `/api/v1/customers/me/birth-profiles`

Example request:
```json
{
  "profileName": "Self",
  "relationship": "SELF",
  "gender": "MALE",
  "dateOfBirth": "1990-01-15",
  "timeOfBirth": "08:30:00",
  "birthTimeAccuracy": "EXACT",
  "birthPlace": {
    "name": "Jaunpur, Uttar Pradesh, India",
    "latitude": 25.7464,
    "longitude": 82.6837,
    "timezone": "Asia/Kolkata"
  },
  "isDefault": true
}
```

### 4.3 Get
**GET** `/api/v1/customers/me/birth-profiles/{profileId}`

### 4.4 Update
**PUT** `/api/v1/customers/me/birth-profiles/{profileId}`

Example request (same schema as create):
```json
{
  "profileName": "My Birth Details",
  "relationship": "SELF",
  "gender": "MALE",
  "dateOfBirth": "1990-01-15",
  "timeOfBirth": "08:30:00",
  "birthTimeAccuracy": "EXACT",
  "birthPlace": {
    "name": "Jaunpur, Uttar Pradesh, India",
    "latitude": 25.7464,
    "longitude": 82.6837,
    "timezone": "Asia/Kolkata"
  },
  "isDefault": true
}
```

### 4.5 Delete
**DELETE** `/api/v1/customers/me/birth-profiles/{profileId}`

Check dependencies (saved reports/consultations); apply soft-delete or archival as appropriate.

### 4.6 Set default
**PATCH** `/api/v1/customers/me/birth-profiles/{profileId}/default`

Request:
```json
{ "isDefault": true }
```

Rules:
- Multiple profiles allowed; only one default profile per customer.
- Default selection must be atomic.
- Relationship enum: `SELF`, `SPOUSE`, `CHILD`, `MOTHER`, `FATHER`, `SIBLING`, `OTHER`.
- Birth-time accuracy enum: `EXACT`, `APPROXIMATE`, `UNKNOWN`.
- Validate latitude (-90 to 90), longitude (-180 to 180), date/time and timezone identifier.
- Allow unknown birth time; do not fabricate it.
- Enforce resource ownership to prevent IDOR/BOLA.

## 5. Contact verification/change

> Existing signup/sign-in OTP is out of scope. Reuse its OTP service with distinct purpose codes for these flows.

### 5.1 Initiate mobile change
**POST** `/api/v1/customers/me/mobile/change/initiate`

Request:
```json
{ "newMobileNumber": "+919876543210" }
```
Return a verification reference, never the OTP.

### 5.2 Verify mobile change
**POST** `/api/v1/customers/me/mobile/change/verify`

Request:
```json
{
  "verificationId": "ver_123",
  "otp": "123456"
}
```
Rules: distinct OTP purpose (e.g. `MOBILE_CHANGE`); update only after successful verification; enforce expiry, retry/cooldown and rate limits; ensure number uniqueness; audit and consider notifying old/new numbers; never log or return OTP.

### 5.3 Initiate email verification
**POST** `/api/v1/customers/me/email/verification/initiate`

Request:
```json
{ "email": "sunil@example.com" }
```

### 5.4 Verify email
**POST** `/api/v1/customers/me/email/verification/verify`

Request:
```json
{
  "verificationId": "ver_email_123",
  "verificationCode": "123456"
}
```

### 5.5 Remove email (optional)
**DELETE** `/api/v1/customers/me/email`

Require confirmation if policy dictates and retain an appropriate recovery/authentication method.

## 6. Preferences

### 6.1 Get preferences
**GET** `/api/v1/customers/me/preferences`

### 6.2 Update preferences
**PUT** `/api/v1/customers/me/preferences`

Request:
```json
{
  "language": "hi",
  "preferredAstrologerLanguage": "hi",
  "dailyHoroscopeEnabled": true,
  "panchangEnabled": true,
  "festivalAlertsEnabled": true,
  "preferredZodiacSign": "ARIES"
}
```
Possible fields: app language, astrologer language, daily horoscope, Panchang, festival alerts, optional zodiac sign. Validate values.

### 6.3 Notification preferences
- **GET** `/api/v1/customers/me/notification-preferences`
- **PUT** `/api/v1/customers/me/notification-preferences`

Request:
```json
{
  "pushEnabled": true,
  "whatsappEnabled": false,
  "smsEnabled": true,
  "emailEnabled": true,
  "marketingNotificationsEnabled": false,
  "dailyHoroscopeEnabled": true,
  "festivalAlertsEnabled": true
}
```
Keep channel-level preferences distinct from legally required transactional/security notifications. Marketing consent must be explicit and independently controllable.

## 7. Sessions and devices

### 7.1 List sessions
**GET** `/api/v1/customers/me/sessions`

Example:
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "sess_123",
      "deviceName": "Android Phone",
      "deviceType": "ANDROID",
      "lastActiveAt": "2026-11-18T10:30:00Z",
      "createdAt": "2026-11-15T10:30:00Z",
      "isCurrentSession": true
    }
  ]
}
```

### 7.2 Revoke one session
**DELETE** `/api/v1/customers/me/sessions/{sessionId}`

### 7.3 Revoke other sessions
**POST** `/api/v1/customers/me/sessions/revoke-all`

Define behavior clearly. Recommended: revoke all *other* sessions while keeping current session; provide a separate logout-all endpoint.

### 7.4 List devices
**GET** `/api/v1/customers/me/devices`

### 7.5 Remove device
**DELETE** `/api/v1/customers/me/devices/{deviceId}`

Device ID is not proof of identity; enforce ownership.

## 8. Security/logout

### 8.1 Security overview
**GET** `/api/v1/customers/me/security`

May return safe security data: current session/device summary, last login, available verification methods, and recent security actions (no secrets).

### 8.2 Logout current session
**POST** `/api/v1/customers/me/security/logout`

Invalidate current session/refresh token.

### 8.3 Logout all
**POST** `/api/v1/customers/me/security/logout-all`

Revoke all sessions/refresh tokens and document whether re-authentication is required.

## 9. Consent and privacy

### 9.1 Get consent records
**GET** `/api/v1/customers/me/consents`

### 9.2 Update consent choices
**PUT** `/api/v1/customers/me/consents`

Request:
```json
{
  "marketingConsent": false,
  "whatsappPromotionalConsent": false,
  "smsPromotionalConsent": false,
  "emailPromotionalConsent": true
}
```

### 9.3 Accept consent document/version
**POST** `/api/v1/customers/me/consents/accept`

Request:
```json
{
  "consentType": "TERMS_AND_CONDITIONS",
  "documentVersion": "1.2",
  "accepted": true
}
```
Consent types may include Terms, Privacy acknowledgement, data processing (where applicable), marketing, WhatsApp, SMS, and email promotions.

Requirements: preserve consent history; record type/version/time/source/channel and audit metadata; allow withdrawal of optional consent; do not bundle optional marketing consent with required service consent.

### 9.4 Privacy overview
**GET** `/api/v1/customers/me/privacy`

May return privacy controls, consent summary, export/deletion info, and policy links.

## 10. Account lifecycle

### 10.1 Deactivate
**POST** `/api/v1/customers/me/deactivation`

Request:
```json
{
  "reason": "Taking a break",
  "confirmation": true
}
```
Confirm (step-up verification if risk policy requires); set a suitable state; revoke/restrict sessions as policy requires; define effects on bookings, wallet, subscriptions, saved content.

### 10.2 Reactivate
**POST** `/api/v1/customers/me/reactivation`

Request:
```json
{ "confirmation": true }
```
Check eligibility and identity; do not reactivate deleted or restricted accounts.

### 10.3 Request deletion
**POST** `/api/v1/customers/me/deletion-request`

Request:
```json
{
  "reason": "No longer required",
  "confirmation": true
}
```

### 10.4 Get deletion status
**GET** `/api/v1/customers/me/deletion-request`

### 10.5 Cancel pending deletion
**DELETE** `/api/v1/customers/me/deletion-request`

Define pending/cancelled/processing/completed states, grace period, session revocation, deletion/anonymization and legal retention exceptions. Avoid claiming immediate permanent deletion if retention/grace period applies.

## 11. Optional support APIs

- **GET** `/api/v1/customers/me/support-requests` — list
- **POST** `/api/v1/customers/me/support-requests` — create
- **GET** `/api/v1/customers/me/support-requests/{ticketId}` — details
- **POST** `/api/v1/customers/me/support-requests/{ticketId}/messages` — add message

Create request:
```json
{
  "category": "ACCOUNT",
  "subject": "Unable to update profile",
  "description": "I receive an error when saving my profile."
}
```
Message request:
```json
{ "message": "I have additional information about this issue." }
```
Verify ticket ownership, validate content/length, paginate lists/messages, and never expose staff-only notes.

## 12. Optional astrologer favorites/recent

- **GET** `/api/v1/customers/me/favorites/astrologers`
- **POST** `/api/v1/customers/me/favorites/astrologers/{astrologerId}`
- **DELETE** `/api/v1/customers/me/favorites/astrologers/{astrologerId}`
- **GET** `/api/v1/customers/me/recent-astrologers`

Validate astrologer existence/status, make favorite-add idempotent, and define recent-history retention.

## 13. Optional customer activity

**GET** `/api/v1/customers/me/activity`

Expose only safe customer-visible actions (profile changes, bookings, customer actions). Never expose OTPs, tokens, internal security logs, or staff notes. Paginate and define retention.

## 14. Endpoint summary

| Area | Method | Endpoint |
|---|---|---|
| Profile | GET | `/customers/me` |
| Profile | PATCH | `/customers/me` |
| Status | GET | `/customers/me/status` |
| Photo | POST | `/customers/me/profile-photo` |
| Photo | DELETE | `/customers/me/profile-photo` |
| Birth profiles | GET | `/customers/me/birth-profiles` |
| Birth profiles | POST | `/customers/me/birth-profiles` |
| Birth profiles | GET | `/customers/me/birth-profiles/{profileId}` |
| Birth profiles | PUT | `/customers/me/birth-profiles/{profileId}` |
| Birth profiles | DELETE | `/customers/me/birth-profiles/{profileId}` |
| Birth profiles | PATCH | `/customers/me/birth-profiles/{profileId}/default` |
| Mobile change | POST | `/customers/me/mobile/change/initiate` |
| Mobile change | POST | `/customers/me/mobile/change/verify` |
| Email verification | POST | `/customers/me/email/verification/initiate` |
| Email verification | POST | `/customers/me/email/verification/verify` |
| Email | DELETE | `/customers/me/email` |
| Preferences | GET | `/customers/me/preferences` |
| Preferences | PUT | `/customers/me/preferences` |
| Notifications | GET | `/customers/me/notification-preferences` |
| Notifications | PUT | `/customers/me/notification-preferences` |
| Sessions | GET | `/customers/me/sessions` |
| Sessions | DELETE | `/customers/me/sessions/{sessionId}` |
| Sessions | POST | `/customers/me/sessions/revoke-all` |
| Devices | GET | `/customers/me/devices` |
| Devices | DELETE | `/customers/me/devices/{deviceId}` |
| Security | GET | `/customers/me/security` |
| Security | POST | `/customers/me/security/logout` |
| Security | POST | `/customers/me/security/logout-all` |
| Consents | GET | `/customers/me/consents` |
| Consents | PUT | `/customers/me/consents` |
| Consents | POST | `/customers/me/consents/accept` |
| Privacy | GET | `/customers/me/privacy` |
| Account | POST | `/customers/me/deactivation` |
| Account | POST | `/customers/me/reactivation` |
| Deletion | POST | `/customers/me/deletion-request` |
| Deletion | GET | `/customers/me/deletion-request` |
| Deletion | DELETE | `/customers/me/deletion-request` |
| Support | GET | `/customers/me/support-requests` |
| Support | POST | `/customers/me/support-requests` |
| Support | GET | `/customers/me/support-requests/{ticketId}` |
| Support | POST | `/customers/me/support-requests/{ticketId}/messages` |
| Favorites | GET | `/customers/me/favorites/astrologers` |
| Favorites | POST | `/customers/me/favorites/astrologers/{astrologerId}` |
| Favorites | DELETE | `/customers/me/favorites/astrologers/{astrologerId}` |
| Recent | GET | `/customers/me/recent-astrologers` |
| Activity | GET | `/customers/me/activity` |

## 15. Common responses and errors

Success:
```json
{
  "success": true,
  "data": {},
  "message": "Request completed successfully"
}
```

Error (Problem Details-compatible):
```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "code": "VALIDATION_ERROR",
  "errors": {
    "dateOfBirth": ["Date of birth must be a valid date."]
  },
  "traceId": "trace_123"
}
```

Recommended status codes:
- `200 OK` — successful read/update/action.
- `201 Created` — resource created.
- `202 Accepted` — asynchronous request accepted.
- `204 No Content` — deletion with no body.
- `400 Bad Request` — malformed request/validation.
- `401 Unauthorized` — missing/invalid authentication.
- `403 Forbidden` — authenticated but forbidden.
- `404 Not Found` — resource missing or not visible to customer.
- `409 Conflict` — uniqueness/state conflict.
- `422 Unprocessable Content` — semantic error, if used consistently.
- `429 Too Many Requests` — rate limit exceeded.
- `500 Internal Server Error` — unexpected error; never expose stack trace.

## 16. Validation/security requirements

- Authenticate every customer endpoint.
- Derive customer ID from authenticated identity; ignore client-provided customer IDs.
- Scope resource access to customer ownership (BOLA/IDOR prevention).
- Use allowlists; prevent mass assignment.
- Never permit self-assigned role, status, verification flags, internal IDs, or unauthorized security fields.
- Rate-limit OTP initiation/verification, contact changes, uploads, and sensitive actions.
- Prevent brute force and enumeration; avoid unnecessary account-existence disclosure.
- Normalize and validate mobile/email, dates, timezones, coordinates, enums, and strings.
- Protect birth details/contact information in storage, logs, exports, and responses.
- Never log OTPs, tokens, or secrets.
- Audit contact, consent, session, account-state and deletion changes.
- Step-up verification for high-risk operations when required.
- Revoke sessions safely; use refresh-token rotation/reuse detection if supported by existing auth.
- Return safe errors with trace IDs, no stack traces or database details.
- Use pagination, sorting allowlists, maximum page sizes.
- Define retention and deletion/anonymization rules.

## 17. QA checklist

### Profile
- [ ] Authenticated customer retrieves own profile; unauthenticated request is `401`.
- [ ] Allowed fields update successfully.
- [ ] Protected/unknown fields rejected or safely ignored.
- [ ] Invalid email, DOB, gender, language, or oversized values rejected.
- [ ] Email change resets verification as intended.
- [ ] Cross-customer access blocked.

### Birth profiles
- [ ] CRUD/list works for own profiles.
- [ ] Multiple profiles allowed.
- [ ] Only one default per customer; switching is atomic.
- [ ] Invalid date/time, coordinates, timezone, enums rejected.
- [ ] Unknown birth time supported without fabricated value.
- [ ] Cross-customer profile access/update/delete blocked.
- [ ] Dependent astrology-record deletion/archival behavior correct.

### Contact verification
- [ ] Initiation returns verification reference, never OTP.
- [ ] OTP purpose isolated from signup/sign-in.
- [ ] Expiry, wrong code, retry limit, cooldown, rate limit tested.
- [ ] Mobile only changes after valid verification.
- [ ] Duplicate mobile handled safely.
- [ ] Email verification state correct.
- [ ] Secrets are absent from logs.

### Preferences/notifications
- [ ] Read/update works and persists.
- [ ] Invalid language/enums rejected.
- [ ] Notification channels persist.
- [ ] Marketing opt-outs honored.
- [ ] Transactional/security messages remain separate from marketing controls.

### Sessions/devices/security
- [ ] List and revoke own sessions/devices.
- [ ] Cross-customer revocation denied.
- [ ] Revoke-all/current-session semantics tested.
- [ ] Logout invalidates session/refresh token.
- [ ] Logout-all revokes intended sessions.

### Consent/privacy
- [ ] Version/timestamp/source correct.
- [ ] Consent history preserved.
- [ ] Optional marketing consent independently withdrawn.
- [ ] Consent changes auditable.
- [ ] No cross-customer data disclosure.

### Account lifecycle
- [ ] Deactivation confirmation and state transitions correct.
- [ ] Deactivated access behavior follows policy.
- [ ] Reactivation eligibility enforced.
- [ ] Deletion request/status/cancel flow works.
- [ ] Grace period, final anonymization/deletion, and legal retention handled.
- [ ] Sessions revoked/restricted appropriately.

### Optional support/favorites/activity
- [ ] Tickets and messages are customer-owned.
- [ ] Cross-customer ticket access denied.
- [ ] Message validation/pagination work.
- [ ] Favorite add is idempotent; invalid/inactive astrologer handled.
- [ ] Activity contains no secrets or staff-only details.

## 18. VAPT checklist

- [ ] Authentication and authorization on every endpoint.
- [ ] BOLA/IDOR across profiles, sessions, devices, tickets, deletion resources.
- [ ] Mass-assignment attempts.
- [ ] Injection testing for user inputs.
- [ ] XSS tests for names, support subjects/descriptions/messages, especially web/admin rendering.
- [ ] CSRF testing if cookie-based auth is used.
- [ ] OTP brute-force/rate-limit tests.
- [ ] Account enumeration tests.
- [ ] File-upload validation, MIME spoofing, oversized/malicious files, image parser tests.
- [ ] Sensitive data exposure in responses, logs, errors, traces.
- [ ] Session fixation, revocation, refresh-token rotation/replay tests as applicable.
- [ ] CORS and TLS configuration.
- [ ] Security headers where applicable.
- [ ] Dependency/vulnerability scans.
- [ ] Audit-log access and integrity.
- [ ] Retention/deletion workflow testing.
- [ ] Consent/privacy workflow testing.
- [ ] Pagination/resource exhaustion tests.

## 19. Implementation phases

### Phase 1 – Foundational customer features
1. Get/update profile.
2. Profile status/completion.
3. Profile photo upload/delete.
4. Birth-profile CRUD/default selection.

### Phase 2 – Preferences and security
1. Preferences.
2. Notification preferences.
3. Mobile change verification.
4. Email verification (if required).
5. Sessions/devices listing and revocation.
6. Logout/logout-all.

### Phase 3 – Privacy and lifecycle
1. Consent history and updates.
2. Privacy overview.
3. Deactivation/reactivation.
4. Deletion request/status/cancellation.

### Phase 4 – Additional features
1. Support requests/messages.
2. Astrologer favorites.
3. Recent astrologers.
4. Customer-visible activity.

## 20. Recommended first delivery

Start with **Phase 1**: profile APIs and birth-profile APIs. They are foundational for Kundli, horoscope, compatibility, matchmaking, and consultation flows. Downstream astrology APIs should reference `birthProfileId` where practical.

## 21. Acceptance criteria

- Every endpoint has documented request/response schemas.
- Authentication and ownership authorization enforced.
- Validation and errors consistent.
- Sensitive actions audited.
- Collections paginated with limits.
- QA checklist executed and results recorded.
- Critical/high VAPT findings resolved before production, following release policy.
- API documentation/version updated.
- Existing OTP signup/sign-in remains unchanged.
