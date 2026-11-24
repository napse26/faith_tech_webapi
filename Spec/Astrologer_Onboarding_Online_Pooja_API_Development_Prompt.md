# Astrology App – Astrologer Onboarding & Online Pooja API Development Prompt

## Context and instructions

The astrology application is already under development with existing APIs, database, authentication, customer-management modules, and project structure.

**Do not redesign or replace the existing technology stack, architecture, authentication, or project structure.** First inspect the existing codebase, conventions, models, migrations, API patterns, authorization, error handling, payment, file storage, and notification services. Reuse existing integrations and avoid duplicate implementations.

Scope is API/backend development, schema changes and migrations as needed, validations, business workflows, API documentation, QA, and VAPT. Do not develop UI/mobile screens unless specifically requested.

OTP signup/sign-in is already implemented. Reuse existing authenticated customer identity and existing verification services where needed.

Develop two modules: (A) Astrologer onboarding/management, and (B) Online pooja catalog/booking.

---

# Module A – Astrologer Onboarding

## A1. Objectives

Allow astrologers to register, complete their profile, specify expertise and qualifications, upload verification documents, configure consultation services/pricing/availability, submit an application, and track admin approval, rejection, or requests for correction. Astrologers must not be publicly discoverable or accept bookings until required approvals and activation are complete.

## A2. Application workflow and statuses

Suggested states: `DRAFT`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `ACTION_REQUIRED`, `APPROVED`, `REJECTED`, `SUSPENDED`, `INACTIVE`.

Suggested transitions:
- DRAFT -> IN_PROGRESS -> SUBMITTED -> UNDER_REVIEW
- UNDER_REVIEW -> ACTION_REQUIRED -> IN_PROGRESS (edit) -> SUBMITTED (resubmit)
- UNDER_REVIEW -> APPROVED or REJECTED
- APPROVED -> SUSPENDED or INACTIVE (authorized action)
- SUSPENDED -> APPROVED or INACTIVE (admin decision)

Enforce transitions server-side. Record actor, timestamp, reason/comments, and history. Astrologers cannot approve themselves or set status directly.

## A3. Astrologer APIs

Use `/api/v1/astrologers` as a suggested namespace; follow established project conventions.

### Onboarding/application
- `POST /api/v1/astrologers/onboarding` – start application for authenticated user.
- `GET /api/v1/astrologers/me/onboarding` – application and completion status.
- `PATCH /api/v1/astrologers/me/onboarding` – update allowed draft fields.
- `POST /api/v1/astrologers/me/onboarding/submit` – submit for review.
- `POST /api/v1/astrologers/me/onboarding/resubmit` – resubmit after correction.
- `GET /api/v1/astrologers/me/onboarding/status` – status, completion, missing requirements.
- `GET /api/v1/astrologers/me/onboarding/history` – review/status history.

### Profile
- `GET /api/v1/astrologers/me/profile`
- `PUT /api/v1/astrologers/me/profile`
- `PATCH /api/v1/astrologers/me/profile`
- `POST /api/v1/astrologers/me/profile/photo`
- `DELETE /api/v1/astrologers/me/profile/photo`

Profile fields may include display/legal name as applicable, photo, bio, languages, years of experience, location/timezone, education/qualifications, astrology tradition/approach, optional demographic fields only when necessary, visibility and completion information.

### Expertise and consultation services
- `GET /api/v1/astrologers/me/expertise`
- `PUT /api/v1/astrologers/me/expertise`
- `GET /api/v1/astrologers/me/services`
- `POST /api/v1/astrologers/me/services`
- `PUT /api/v1/astrologers/me/services/{serviceId}`
- `DELETE /api/v1/astrologers/me/services/{serviceId}`

Expertise should be configurable/admin-managed, with examples: Vedic Astrology, Numerology, Tarot, Vastu, Palmistry, KP Astrology, Prashna, Kundli/Horoscope analysis, Other. Consultation services may include chat, audio, video, or in-person if supported. Define duration, price, currency, status, and applicable rules for each.

### Qualifications and experience
- `GET /api/v1/astrologers/me/qualifications`
- `POST /api/v1/astrologers/me/qualifications`
- `PUT /api/v1/astrologers/me/qualifications/{qualificationId}`
- `DELETE /api/v1/astrologers/me/qualifications/{qualificationId}`

Fields may include certificate/qualification name, issuer/institution, year, description, attachment reference, and verification status. Do not mark qualifications verified until reviewed.

### Documents and verification
- `GET /api/v1/astrologers/me/documents`
- `POST /api/v1/astrologers/me/documents`
- `GET /api/v1/astrologers/me/documents/{documentId}`
- `DELETE /api/v1/astrologers/me/documents/{documentId}` (only if permitted)

Configurable document types may include identity, address proof, qualification/certificate, experience proof, photo, and other compliance documents. Document states: `UPLOADED`, `PENDING_REVIEW`, `VERIFIED`, `REJECTED`, `EXPIRED`, `REUPLOAD_REQUIRED`. Secure private file storage, controlled/short-lived access, content/type/size validation, malware scan where available, reviewer audit, and rejection/re-upload reasons are required. Never expose private documents in public profiles.

### Bank/payout details
- `GET /api/v1/astrologers/me/payout-details`
- `PUT /api/v1/astrologers/me/payout-details`
- `POST /api/v1/astrologers/me/payout-details/verification`

Fields may include account-holder name, bank name, account number, IFSC, payout method, and provider verification state. Mask fields in responses, protect sensitive values, never log full account details, reuse existing payout integrations, and prevent self-verification.

### Pricing
- `GET /api/v1/astrologers/me/pricing`
- `PUT /api/v1/astrologers/me/pricing`

Support per-service rate, unit/duration, currency, effective dates, minimum/maximum constraints, taxes and commission rules as applicable. Calculate rates/commission server-side; use configured limits.

### Availability and schedule
- `GET /api/v1/astrologers/me/availability`
- `PUT /api/v1/astrologers/me/availability`
- `POST /api/v1/astrologers/me/availability/exceptions`
- `PUT /api/v1/astrologers/me/availability/exceptions/{exceptionId}`
- `DELETE /api/v1/astrologers/me/availability/exceptions/{exceptionId}`

Support weekly schedule, timezone, breaks, days off, date exceptions, service-specific hours, lead time, booking horizon, buffers, and slot capacity if needed. Prevent schedule conflicts and double-booking; correctly handle timezone and daylight-saving changes.

### Online status
- `GET /api/v1/astrologers/me/online-status`
- `PUT /api/v1/astrologers/me/online-status`

States may be `ONLINE`, `OFFLINE`, `BUSY`, `PAUSED`. Only approved and active astrologers can be available for customer bookings. Integrate with existing real-time status infrastructure, if any.

### Optional astrologer dashboard
- `GET /api/v1/astrologers/me/dashboard`
- `GET /api/v1/astrologers/me/earnings/summary`
- `GET /api/v1/astrologers/me/consultations`

Only return the astrologer's own performance, booking, and earnings data.

## A4. Public astrologer discovery

Only approved, active, public astrologers should be discoverable:
- `GET /api/v1/astrologers` – list/search/filter.
- `GET /api/v1/astrologers/{astrologerId}` – public profile.
- `GET /api/v1/astrologers/{astrologerId}/services`
- `GET /api/v1/astrologers/{astrologerId}/availability`

Filters may include expertise, language, rating, service type, price, experience, and online status. Pagination and allowlisted sorting required. Hide private application, documents, identity, payout, reviewer notes, and internal fields.

## A5. Admin astrologer management

Use existing admin roles/policies:
- `GET /api/v1/admin/astrologers/applications`
- `GET /api/v1/admin/astrologers/{astrologerId}/application`
- `POST /api/v1/admin/astrologers/{astrologerId}/review/start`
- `POST /api/v1/admin/astrologers/{astrologerId}/review/request-changes`
- `POST /api/v1/admin/astrologers/{astrologerId}/review/approve`
- `POST /api/v1/admin/astrologers/{astrologerId}/review/reject`
- `POST /api/v1/admin/astrologers/{astrologerId}/suspend`
- `POST /api/v1/admin/astrologers/{astrologerId}/reactivate`
- `GET /api/v1/admin/astrologers/{astrologerId}/documents`
- `POST /api/v1/admin/astrologers/{astrologerId}/documents/{documentId}/verify`
- `POST /api/v1/admin/astrologers/{astrologerId}/documents/{documentId}/reject`
- `GET /api/v1/admin/astrologers/{astrologerId}/audit-history`

Require review comments/reasons where appropriate. Audit every admin decision. Only authorized admins can approve, reject, verify, suspend, or reactivate.

## A6. Astrologer QA/VAPT

QA tests: application draft/create/update, required-field validation, accurate completion status, valid/invalid state transitions, submit/resubmit, correction requests, admin-only approval, rejected/suspended visibility and booking restrictions, secure uploads, private document access, bank masking, pricing validation, schedule/timezone/exceptions/overlaps, ownership checks, and audit history.

VAPT tests: IDOR/BOLA, role bypass, status tampering/self-approval, mass assignment (status, verification, role, commission, payout/internal fields), file type spoofing/path traversal/oversized or malicious uploads, private file access, PII/bank leakage, injection/XSS/CSRF where applicable, rate limiting/enumeration, scheduling race conditions, admin authorization and audit integrity.

---

# Module B – Online Pooja Catalog and Booking

## B1. Objectives

Customers browse pooja offerings, review details/packages, select delivery mode/location/date/slot, submit devotee/sankalp information, pay, receive confirmation and reminders, track fulfillment, and use cancellation/rescheduling/refund options under policy. Admins manage offerings, packages, priests/providers, schedules, bookings and refunds.

## B2. Catalog APIs

- `GET /api/v1/poojas/categories`
- `GET /api/v1/poojas` – searchable/filterable catalog.
- `GET /api/v1/poojas/{poojaId}` – detail.
- `GET /api/v1/poojas/{poojaId}/packages`
- `GET /api/v1/poojas/{poojaId}/availability`
- `GET /api/v1/poojas/{poojaId}/requirements`

Catalog fields may include name, category, descriptions, occasion/purpose, duration, ritual steps, included items, samagri requirements and responsibility, instructions, supported languages, delivery modes (`ONLINE`, `TEMPLE`, `CUSTOMER_LOCATION` as configured), temple/location details, images, packages, price/currency/taxes, cancellation/reschedule policy, lead time, availability and publication status (`DRAFT`, `PUBLISHED`, `ARCHIVED`). Do not promise guaranteed outcomes in product content.

Filters: category, keyword, delivery mode, temple/location, availability/date, price range, optional popularity. Paginate and allowlist sort options. Only published offerings may be booked.

## B3. Packages and add-ons

- `GET /api/v1/poojas/{poojaId}/packages`
- `GET /api/v1/poojas/{poojaId}/addons`

Packages can specify base offering, duration, priest/service level, samagri inclusion, devotee count, delivery mode and price. Add-ons may include additional devotees, special sankalp, samagri, offerings/donations or other configured options. Validate add-ons, quantities, limits, eligibility and current pricing. Snapshot package, price, add-ons, taxes/fees and applicable cancellation policy on the booking so catalog edits do not alter an existing booking unexpectedly.

## B4. Booking state machine and flow

Suggested booking states: `DRAFT`, `PENDING_SLOT_CONFIRMATION`, `PENDING_PAYMENT`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `RESCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `PAYMENT_FAILED`, `REFUND_PENDING`, `REFUNDED`, `PARTIALLY_REFUNDED`, and optionally `NO_SHOW`.

Define and enforce allowed state transitions; never accept client-supplied status as authoritative.

Flow:
1. Customer selects pooja/package.
2. API returns current availability/slots.
3. Customer selects slot and submits devotee/sankalp details.
4. API validates eligibility, slot, limits and price, and temporarily reserves slot when applicable.
5. Initiate payment through existing payment integration.
6. Verify payment callback/webhook and process idempotently.
7. Confirm booking after verified successful payment (unless a documented pay-later flow applies); notify customer.
8. On failed/expired payment, release reserved slot under policy.
9. Provider fulfills pooja; optionally supply live-stream/session details.
10. Mark completed, save fulfillment details and issue receipt.
11. Cancellation, reschedule and refund follow configured policy and audit trail.

## B5. Customer booking APIs

- `POST /api/v1/pooja-bookings/quote` – validate selections, calculate total and quote expiry.
- `POST /api/v1/pooja-bookings` – create booking from valid quote/selections.
- `GET /api/v1/pooja-bookings` – customer's history, filters and pagination.
- `GET /api/v1/pooja-bookings/{bookingId}` – booking detail; enforce ownership.
- `POST /api/v1/pooja-bookings/{bookingId}/payment/initiate` – initiate/retry payment if policy permits.
- `GET /api/v1/pooja-bookings/{bookingId}/payment-status`
- `POST /api/v1/pooja-bookings/{bookingId}/cancel`
- `POST /api/v1/pooja-bookings/{bookingId}/reschedule`
- `GET /api/v1/pooja-bookings/{bookingId}/receipt`
- `GET /api/v1/pooja-bookings/{bookingId}/live-session` – if live session exists.
- `POST /api/v1/pooja-bookings/{bookingId}/feedback` – optional after completion.

Example quote request:
```json
{
  "poojaId": "pooja_123",
  "packageId": "pkg_123",
  "deliveryMode": "ONLINE",
  "slotId": "slot_123",
  "addOns": [{ "addOnId": "addon_1", "quantity": 1 }],
  "devotees": [{ "fullName": "Devotee Name", "gotra": "Kashyap", "dateOfBirth": "1990-01-15" }],
  "sankalpDetails": {
    "purpose": "Family wellbeing",
    "specialInstructions": "Please include the family name during sankalp."
  }
}
```

Illustrative quote response (values are examples; use the product's actual currency/pricing/tax rules):
```json
{
  "success": true,
  "data": {
    "quoteId": "quote_123",
    "expiresAt": "2026-11-22T18:30:00Z",
    "currency": "INR",
    "priceBreakdown": { "basePrice": 2500, "addOnsTotal": 500, "taxes": 0, "discount": 0, "total": 3000 },
    "slot": { "slotId": "slot_123", "startAt": "2026-12-01T10:00:00+05:30", "endAt": "2026-12-01T12:00:00+05:30", "timezone": "Asia/Kolkata" }
  }
}
```

Example reschedule request:
```json
{ "newSlotId": "slot_456", "reason": "Date change request" }
```

Rules: enforce status, cancellation/reschedule cutoffs, policy, slot availability and charges. Return eligibility/fee information before final action when appropriate. Prevent duplicate actions. Rescheduling should atomically reserve the new slot and release the old slot on successful confirmation. Refund calculation and processing must be server-side and idempotent.

## B6. Availability and slot APIs

- `GET /api/v1/poojas/{poojaId}/availability?date=YYYY-MM-DD`
- `GET /api/v1/poojas/{poojaId}/slots?date=YYYY-MM-DD&packageId=...&deliveryMode=...`
- `GET /api/v1/pooja-bookings/{bookingId}/available-reschedule-slots`
- If priests are individually assigned: `GET /api/v1/priests/{priestId}/availability`

Use explicit timezone, duration, buffers, lead time and booking horizon. Prevent concurrent double booking through atomic reservations/locking or equivalent. Define reservation expiry and slot release on failed/expired payments or cancellation. Handle location-specific slots and concurrent requests correctly.

## B7. Devotee/sankalp details

Depending on pooja requirements, collect primary/additional devotee names, gotra, DOB/birth details only when necessary, sankalp purpose, instructions, preferred language, delivery mode, temple or customer address (if required), booking contact, and acceptance of terms/cancellation policy.

Minimize personal data. Validate fields according to pooja configuration. Limit access to customer, assigned provider/priest and authorized admin. Avoid logging sensitive sankalp/birth details. For customer-location poojas, validate service area and additional charges.

## B8. Payment, confirmation, refunds and receipts

Reuse existing payment APIs/services—do not create a parallel payment system. Requirements:
- Server-calculated price, fees, taxes, discount and payment amount.
- Initiation and callback/webhook using current provider integration.
- Verify webhook signatures/authenticity.
- Idempotent payment processing; handle duplicate and out-of-order events.
- Confirm only after verified payment unless pay-later is a defined policy.
- Handle failed/expired payments and release slots.
- Refund eligibility, amount, fees and state determined by server.
- Store provider transaction references, never payment credentials.
- Receipt/invoice endpoint and stable booking reference.
- Notifications for payment, confirmation, reschedule, cancellation, refund, reminder and completion.
- Auditable booking/payment/refund history.

## B9. Priest/provider fulfillment (if applicable)

If individual priests, temples, or partners fulfill bookings, consider:
- `GET /api/v1/priests` and `GET /api/v1/priests/{priestId}` for public/eligible providers.
- `GET /api/v1/priests/{priestId}/availability`
- Admin/provider assignment APIs.
- Provider's assigned booking list/details.
- Accept/reject assignment if workflow requires.
- Mark preparation, in-progress, completed.
- Upload completion evidence if permitted.
- Live-session/link management if supported.

Keep fulfillment status separate from payment and booking status when these lifecycles differ. Check provider assignment and permissions.

## B10. Admin pooja management APIs

- `GET /api/v1/admin/poojas`
- `POST /api/v1/admin/poojas`
- `GET /api/v1/admin/poojas/{poojaId}`
- `PUT /api/v1/admin/poojas/{poojaId}`
- `PATCH /api/v1/admin/poojas/{poojaId}/status`
- `DELETE /api/v1/admin/poojas/{poojaId}` (archive/soft-delete as appropriate)
- `POST /api/v1/admin/poojas/{poojaId}/images`
- Package/add-on CRUD under `/api/v1/admin/poojas/{poojaId}/packages` and `/addons`.
- Category/configuration CRUD as needed.
- Schedule/slot configuration APIs.
- `GET /api/v1/admin/pooja-bookings`
- `GET /api/v1/admin/pooja-bookings/{bookingId}`
- Admin booking actions: confirm if manual, assign priest/provider, reschedule, cancel, mark in progress/completed, handle refund requests.
- `GET /api/v1/admin/pooja-bookings/{bookingId}/audit-history`

Require role/policy authorization and audit every admin action. Customer/astrologer roles cannot access admin endpoints.

## B11. Pooja QA/VAPT

QA tests: catalog categories/search/filter/sort/pagination; unpublished offering unavailable; package/add-on validation; server pricing; quote expiry/stale prices; timezone/date/slot/duration/lead-time validation; concurrent same-slot booking; reservation expiry/release; successful/failed/pending/duplicate/delayed/out-of-order payment callbacks; confirmation only after verified payment; cancellation/reschedule cutoff; full/partial refund calculation and retries; customer ownership; admin/provider permissions; devotee data access controls; notification duplication; receipts/history; valid state transitions; provider fulfillment if applicable.

VAPT tests: booking/quote/payment/receipt/live-session/provider IDOR/BOLA; status tampering; price/discount/tax/add-on/refund/cancellation fee tampering; webhook signature/replay/duplicate/order attacks; slot race/double booking; admin/provider authorization; injection/XSS and CSRF if cookie auth; sensitive devotee/sankalp/address leakage; booking/payment reference enumeration; rate limits/resource exhaustion; upload validation; audit integrity.

---

# Common requirements and deliverables

## API/security standards
- Follow existing project conventions for auth, responses, errors, validation, logging, database, and documentation.
- Additive migrations only as necessary; do not replace existing schema.
- Consistent response envelope and error codes; paginated lists with maximum limits and allowlisted sorting.
- Validate identifiers, enums, dates, timezones, currency, numeric values, files and state transitions.
- Transactions for multi-step changes; idempotency for booking, payment, refund and retry actions.
- Concurrency safety for slot reservations and transitions.
- Protect PII, private documents, payout data, devotee data, secrets and internal reviewer notes.
- Audit sensitive actions and admin decisions.
- Reuse existing payment, notification, OTP, storage, and streaming integrations.
- Never fake or assume payment success; verify provider events.
- Maintain backward compatibility; document any required changes.

## Database work
Inspect existing entities and reuse them. Propose and implement only needed schema/migrations for applications, profiles, expertise/services, qualifications/documents, payout details (if applicable), schedules/availability, pooja catalog/categories/packages/add-ons, slots/reservations, bookings, booking details, payment/refund references, fulfillment, and audit history. Add appropriate foreign keys, unique constraints, indexes, transaction guarantees, and retention/soft-delete policies. Avoid duplicate customer, auth, payment, notification tables where existing equivalents exist.

## Required deliverables
1. Codebase review and integration-point summary.
2. Endpoint inventory and implementation plan.
3. Database/migration changes with rationale.
4. Astrologer onboarding, status workflow, document, profile, service, availability, and admin review APIs.
5. Public astrologer discovery APIs.
6. Pooja catalog, category, package and add-on APIs.
7. Availability/slot, quote, booking, payment, cancellation, reschedule, refund and receipt APIs.
8. Priest/provider fulfillment APIs if relevant.
9. Request/response examples and API docs.
10. Validation and authorization matrix.
11. Automated unit/integration/API tests.
12. QA checklist/results and VAPT checklist/findings/fixes.
13. Migration/deployment notes and new configuration keys (never include secrets).
14. Business decisions/questions that require clarification—list them rather than silently assuming.

## Recommended implementation phases

### Phase 1 – Astrologer onboarding
Application/draft/completion/submit/resubmit; profile, expertise, qualifications, documents; admin review/request changes/approval/rejection; public approved profile.

### Phase 2 – Astrologer operations
Consultation service types, pricing, payout verification, availability and exceptions, online status, dashboard/consultation history where supported.

### Phase 3 – Pooja catalog
Categories, catalog/detail, packages, add-ons, admin management/publication, schedule/availability configuration.

### Phase 4 – Booking and payment
Quote, slot reservation, booking, payment verification, confirmation, history, cancel/reschedule/refund/receipt.

### Phase 5 – Fulfillment and release hardening
Priest/provider assignment, operational workflow, live-session integration if available, reminders/notifications, feedback, QA regression, VAPT, performance and concurrency testing.

## Acceptance criteria
- Existing stack, project conventions and integrations reused.
- Authentication, ownership, role checks and admin authorization enforced.
- Astrologer status cannot be client-tampered; no self-approval.
- Only eligible approved astrologers publicly listed and bookable.
- Only published pooja offerings bookable.
- Prices, fees, cancellation and refunds calculated server-side.
- Slot booking is concurrency-safe; no double bookings.
- Payment provider events are verified and idempotent.
- Sensitive documents, payout and devotee data protected.
- State transitions and admin decisions audited.
- QA/VAPT results and remediation documented.
- Existing APIs/modules remain functional after development.

**Begin by reviewing the current repository and report existing modules/integration points. Then implement in the phases above, delivering code, migrations, documentation and tests incrementally.**
