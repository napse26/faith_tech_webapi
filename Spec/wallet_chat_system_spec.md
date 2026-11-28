# Wallet & Astrology Chat System — Production Specification

**Project:** Faith Tech Astrology / Consultation Backend  
**Document version:** 1.0  
**Prepared:** 27 November 2026  
**Backend stack:** Node.js, TypeScript, PostgreSQL, Prisma, Socket.IO  
**Status:** Implementation specification — wallet-service integration details must be confirmed against the existing wallet service before coding or migration.

---

## 1. Purpose

This document specifies a production-ready wallet and astrologer-customer chat system for the existing astrology application.

The implementation must:

- Preserve existing users, astrologers, wallets, wallet transactions, consultations and application data.
- Extend the existing schema additively; do not replace existing core tables.
- Use the existing wallet as the source of truth for customer funds, after confirming the existing service's balance convention.
- Support per-minute chat billing.
- Require the astrologer to manually accept or reject each incoming chat request.
- Support text messages, images, general file attachments and voice notes.
- Provide REST APIs for durable operations and Socket.IO for real-time events.
- Be safe against duplicate requests, duplicate charges, race conditions, disconnects and server restarts.

This is a specification, not a claim that the new tables or APIs already exist.

## 2. Existing database facts from the supplied `schema.prisma`

The following facts are taken from the supplied Prisma schema.

### 2.1 Existing identity and astrologer records

| Model | Primary key | Relevant fields |
|---|---|---|
| `users` | `user_id BigInt` | `mobile_no`, `full_name`, `wallet_balance Decimal(18,2)`, `is_active`, `status` |
| `astrologers` | `astrologer_id BigInt` | `user_id BigInt` (unique), `display_name`, `chat_rate Decimal(10,2)`, `commission_percentage`, `is_online`, `is_busy`, `is_verified` |

An astrologer profile is linked to a user account through `astrologers.user_id`. API authentication should identify the authenticated `users.user_id`; astrologer-only operations must resolve that user to the associated `astrologers.astrologer_id` and validate the role/profile.

### 2.2 Existing wallet records

| Model | Primary key | Relevant fields |
|---|---|---|
| `wallets` | `wallet_id BigInt` | `user_id BigInt` (unique), `balance Decimal(18,2)` |
| `wallet_transactions` | `wallet_transaction_id BigInt` | `wallet_id`, `transaction_type`, `amount Decimal(18,2)`, `reference_no`, `remarks`, `created_on` |

The supplied schema also has `users.wallet_balance Decimal(18,2)`. This means two balance-like fields currently exist:

- `wallets.balance`
- `users.wallet_balance`

**Mandatory pre-implementation decision:** inspect the existing wallet service and production data to establish which field is authoritative and whether the other is maintained as a compatibility mirror. Do not independently update both fields until the existing convention is confirmed. Do not silently overwrite or reconcile balances during migration.

### 2.3 Existing consultation records

The schema contains:

- `consultations` with `consultation_id BigInt` and `consultation_type`.
- `user_consultation_sessions_detail` with `session_id BigInt`, `consultation_id`, `user_id`, `astrologer_id`, `start_time`, `end_time`, `total_minutes Decimal(10,2)`, `rate_per_minute Decimal(10,2)`, `total_amount Decimal(18,2)`, and `session_status`.

This existing session-detail model may be used for reporting/compatibility only after reviewing its current write paths and business meaning. The new chat system should not write to it automatically unless the existing application expects chat sessions to appear there. If it is used, the relationship and transaction boundaries must be explicitly designed to prevent duplicate billing or duplicate session records.

### 2.4 Existing schema conventions

- Core user and astrologer IDs are `BigInt`.
- Some newer entities use UUIDs.
- Monetary values are stored as `Decimal`, generally with two decimal places.
- Timestamps commonly use PostgreSQL `timestamptz(6)`.
- Prisma datasource uses `DATABASE_URL` and `DIRECT_URL`.

New foreign keys to users and astrologers must use `BigInt`, referencing the exact existing primary keys.

---

## 3. Scope and non-goals

### In scope

1. Customer wallet balance and ledger integration.
2. Wallet credit/debit operations with idempotency.
3. Chat request creation and astrologer manual acceptance/rejection.
4. Chat session lifecycle.
5. Per-minute billing and settlement.
6. Text, image, file and voice-note messages.
7. REST APIs, Socket.IO events, background workers and operational logging.
8. Additive Prisma schema and reviewed PostgreSQL migrations.
9. Security, auditability, testing and deployment requirements.

### Out of scope unless separately approved

- Replacing the payment gateway or existing payment transaction module.
- Replacing existing user authentication, roles or astrologer onboarding.
- Astrologer bank payouts and payout reconciliation.
- Audio/video calling.
- AI-generated astrology advice.
- Changes to existing pooja, appointment or other service billing.
- Deleting or renaming existing wallet, user, astrologer or consultation tables.

---

## 4. Business rules and configurable decisions

The following are recommended defaults. They must be confirmed against product policy before release.

| Rule | Recommended behavior |
|---|---|
| Chat rate | Snapshot `astrologers.chat_rate` when request/session is created; store on session |
| Rate unit | INR per minute |
| Billing start | Only after astrologer accepts and the chat becomes active |
| Billing interval | Charge each started minute (`ceil(elapsed_seconds / 60)`) |
| Billing stop | Stop at the server-recorded end timestamp |
| Minimum wallet balance | Require enough balance for at least one billable minute before request; recheck before activation |
| Low balance | Notify participants and end chat safely when the next billing interval cannot be funded |
| Request timeout | Configurable; suggested default 30 seconds |
| Astrologer action | Manual accept or reject; no automatic acceptance |
| Concurrent sessions | One active chat per astrologer by default |
| Customer concurrency | One pending/active chat per customer by default unless product explicitly allows otherwise |
| Currency | INR; store monetary values in exact decimal/paise-safe form |
| Refund | Refund only amounts captured/reserved but not earned/consumed, according to ledger policy |
| Media access | Private object storage; time-limited signed access |
| Message edits/deletes | No hard deletion of billable/audit records; define moderation and retention policy |

### 4.1 Billing-rounding policy

This specification uses **started-minute billing** as a proposed default:

- 1–60 seconds: 1 minute.
- 61–120 seconds: 2 minutes.
- 121–180 seconds: 3 minutes.

Formula:

`billable_minutes = ceil((ended_at - billing_started_at) in seconds / 60)`

`gross_charge = billable_minutes * rate_per_minute`

If the business chooses per-second prorating instead, the formula, user disclosures, billing worker and tests must all be changed together. Do not mix rounding methods between API, worker and reports.

### 4.2 Wallet funding strategy

Two valid approaches exist; choose one after inspecting the existing wallet service.

**Approach A — atomic debit per billing interval (recommended when no wallet-hold feature exists):**
- At activation, verify the customer can fund the first minute.
- Debit one minute atomically before or at the start of that billable interval.
- Continue interval-by-interval.
- If the next debit fails, stop billing and end the chat without allowing unpaid time to accrue.
- Every debit must be idempotent and reference the session plus interval number.

**Approach B — reserve funds / wallet hold:**
- Reserve a maximum/initial amount at activation.
- Consume from the reservation as minutes accrue.
- Release unused reserved funds at end.
- Use only if the current wallet architecture supports holds or can be extended with a rigorously audited reservation ledger.

Do not implement a fake reservation by merely subtracting from one balance and later guessing how much to refund. Do not create a second wallet balance table.

---

## 5. Wallet system specification

### 5.1 Wallet principles

1. One wallet per user, consistent with `wallets.user_id @unique`.
2. All balance mutations happen on the server.
3. Every balance mutation has a corresponding immutable transaction/ledger record.
4. Client applications must never submit a new wallet balance.
5. All money values are validated as positive amounts with a defined currency.
6. Use database transactions and row-level locking or atomic conditional updates.
7. Use idempotency keys for every externally retriable financial operation.
8. Never delete or edit a posted financial ledger entry to correct it; create a compensating transaction.
9. A wallet balance must never become negative unless the product explicitly approves credit/overdraft behavior.
10. Use decimal-safe arithmetic. Do not use JavaScript floating-point arithmetic for money.

### 5.2 Existing ledger compatibility

The current `wallet_transactions` model has:

- `wallet_transaction_id`
- `wallet_id`
- `transaction_type`
- `amount`
- `reference_no`
- `remarks`
- `created_on`

Before implementing, inspect all existing values of `transaction_type` and existing wallet service behavior. Define a mapping for existing values rather than renaming or changing them blindly.

Suggested semantic transaction types (adapt to existing naming convention):

- `TOPUP` — successful wallet credit from a verified payment.
- `CHAT_DEBIT` — amount charged for a chat billing interval.
- `CHAT_REFUND` — compensating refund for a failed/unused charge.
- `ADMIN_CREDIT` — authorized manual credit.
- `ADMIN_DEBIT` — authorized manual debit.
- `PROMO_CREDIT` — promotional credit, if supported.
- `REVERSAL` — reversal/compensation linked to an original transaction.

A top-up must be credited only after payment gateway verification, not merely after a client success redirect.

### 5.3 Required wallet operation contract

Implement wallet operations in a single domain service. Chat must call this service; it must not update `wallets.balance` directly.

Suggested service contract:

```ts
type Money = string; // Decimal string, e.g. "100.00"

type WalletMutationInput = {
  userId: bigint;
  amount: Money;             // strictly positive
  transactionType: string;
  referenceNo: string;       // unique business reference
  idempotencyKey: string;    // unique per logical operation
  remarks?: string;
};

type WalletMutationResult = {
  walletId: bigint;
  transactionId: bigint;
  balanceBefore: Money;
  balanceAfter: Money;
  amount: Money;
  transactionType: string;
  duplicate: boolean;
};

interface WalletService {
  getBalance(userId: bigint): Promise<Money>;
  credit(input: WalletMutationInput): Promise<WalletMutationResult>;
  debit(input: WalletMutationInput): Promise<WalletMutationResult>;
}
```

The actual names and shape must be adapted to the existing service rather than introducing a parallel wallet implementation.

### 5.4 Atomic debit behavior

A debit must be one atomic database transaction:

1. Resolve the user's wallet.
2. Check whether the idempotency key or business reference has already been processed.
3. Lock the wallet row or use a conditional update.
4. Confirm sufficient balance.
5. Decrease the authoritative balance.
6. Insert the wallet transaction row.
7. Update `users.wallet_balance` only if the existing service treats it as a required mirror.
8. Commit.
9. Return the persisted transaction and resulting balance.

A conditional update pattern is preferred where suitable:

```sql
UPDATE wallets
SET balance = balance - $1
WHERE wallet_id = $2
  AND balance >= $1
RETURNING balance;
```

This must execute inside the same transaction as the ledger insert. Adapt SQL types and null handling to the actual database. A `NULL` balance must be handled explicitly; do not assume it is zero without verifying the existing data and business rule.

### 5.5 Idempotency

A retried request must not debit or credit twice.

Recommended additive table:

`wallet_idempotency_records`
- `id` UUID primary key.
- `user_id` BIGINT FK to `users.user_id`.
- `idempotency_key` VARCHAR(150).
- `operation_type` VARCHAR(30).
- `request_hash` VARCHAR(64).
- `wallet_transaction_id` BIGINT nullable FK to `wallet_transactions.wallet_transaction_id`.
- `status` VARCHAR(20): `PROCESSING`, `SUCCEEDED`, `FAILED`.
- `response_json` JSONB nullable.
- `created_at`, `updated_at` TIMESTAMPTZ.
- Unique constraint on `(user_id, idempotency_key)`.

If adding this table is not practical, a unique, deterministic `reference_no` strategy can be used, but it must be enforced by a database unique constraint or equivalent concurrency-safe mechanism. The existing `reference_no` is currently nullable and not declared unique, so application-only duplicate checks are insufficient under concurrency.

### 5.6 Wallet APIs

All endpoints require authentication and authorization.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/wallet` | Current user's wallet balance and wallet summary |
| `GET` | `/api/v1/wallet/transactions` | Paginated transaction history |
| `GET` | `/api/v1/wallet/transactions/:transactionId` | Own transaction detail |
| `POST` | `/api/v1/wallet/topup/order` | Create payment order; does not credit wallet |
| `POST` | `/api/v1/wallet/topup/verify` | Verify gateway payment and credit exactly once |
| `POST` | `/api/v1/admin/wallets/:userId/credit` | Admin-only credit with reason and audit |
| `POST` | `/api/v1/admin/wallets/:userId/debit` | Admin-only debit with reason and audit |

Top-up APIs must use the existing payment gateway integration and existing `payment_transactions` behavior after inspection. Never trust a payment status sent by the browser/app.

### 5.7 Wallet API validation and responses

- Amount must be positive, within configured limits and represented as a decimal string.
- Reject invalid precision beyond currency precision.
- Validate ownership before returning wallet or transaction details.
- Use cursor or page-based pagination with bounded page size.
- Never expose internal gateway secrets, raw payment credentials or other users' wallet data.
- Return stable error codes such as `WALLET_NOT_FOUND`, `INSUFFICIENT_BALANCE`, `INVALID_AMOUNT`, `DUPLICATE_REQUEST`, `PAYMENT_NOT_VERIFIED`.

Example balance response:

```json
{
  "success": true,
  "data": {
    "currency": "INR",
    "balance": "250.00"
  }
}
```

Example insufficient balance response:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Your wallet balance is not sufficient to start this chat."
  }
}
```

---

## 6. Chat system specification

### 6.1 Roles

- **Customer:** authenticated user with permission to request a chat.
- **Astrologer:** authenticated user mapped to an active astrologer profile.
- **Admin/support:** authorized staff who may review reports or perform permitted interventions.

Never accept `user_id` or `astrologer_id` as proof of identity from a request body. Derive the actor from the authenticated token and resolve the astrologer profile server-side.

### 6.2 Session lifecycle

Recommended chat status values:

- `PENDING` — customer has requested chat; waiting for astrologer.
- `ACCEPTED` — astrologer accepted; preparing activation.
- `ACTIVE` — billing has started and chat is available.
- `REJECTED` — astrologer rejected.
- `EXPIRED` — no astrologer action before request expiry.
- `CANCELLED` — customer or authorized actor cancelled before activation.
- `COMPLETED` — chat ended normally.
- `FAILED` — activation or system operation failed.

Billing state should be separate:

- `NOT_STARTED`
- `READY`
- `RUNNING`
- `SETTLED`
- `REFUNDED`
- `FAILED`

Do not overload one status field with both conversation lifecycle and financial settlement state.

### 6.3 Request and acceptance flow

1. Customer requests chat with an astrologer.
2. Server authenticates customer and resolves astrologer.
3. Server validates astrologer is verified, enabled, online/available and not busy, subject to current product rules.
4. Server reads the current `chat_rate` and snapshots it into the chat session.
5. Server checks wallet eligibility for the initial billable amount.
6. Server creates a `PENDING` session with an expiry timestamp and unique request identifier.
7. Server emits a private incoming-request event to the astrologer.
8. Astrologer manually accepts or rejects.
9. Accept/reject is an atomic compare-and-set operation. Only one terminal decision can win.
10. If accepted, server rechecks availability and wallet eligibility, marks the astrologer busy, sets `billing_started_at`, activates the chat and begins billing.
11. If rejected, cancelled or expired, no chat usage fee is charged.
12. If activation fails after acceptance, the session must be moved to a safe failed/cancelled state, astrologer busy state released, and any captured/reserved money handled through a compensating ledger operation.

### 6.4 Race-condition controls

- Use a transaction for accept/reject state changes.
- Accept only where status is still `PENDING` and `expires_at > now()`.
- A second accept or reject must return a conflict response.
- Prevent an astrologer from accepting multiple overlapping active sessions. Use a database constraint or transaction-safe lock; do not rely only on `is_busy` in application memory.
- The `astrologers.is_busy` field may be maintained for existing UI compatibility, but the chat-session database state must be authoritative for concurrency.
- Do not trust Socket.IO event ordering for state transitions; REST/database operations are authoritative.

### 6.5 Request expiry

Use a background worker to expire pending requests whose `expires_at` has passed.

- Worker must be safe to run on multiple application instances.
- Use atomic update/claim semantics.
- Expiry must be idempotent.
- Notify customer and astrologer after the database state changes.
- Suggested default timeout: 30 seconds, configurable by environment/configuration.

### 6.6 Session timing

Store server-authoritative timestamps:

- `requested_at`
- `accepted_at`
- `billing_started_at`
- `ended_at`
- `expires_at`

Do not calculate charge from client device time. Use PostgreSQL/server time consistently. Record the reason and actor for termination.

---

## 7. Proposed additive chat database design

The names below are proposed. Check for existing tables or naming conflicts before creating them.

### 7.1 `chat_sessions`

Suggested fields:

| Field | Type | Purpose |
|---|---|---|
| `chat_session_id` | UUID | Primary key |
| `customer_user_id` | BIGINT | FK to `users.user_id` |
| `astrologer_id` | BIGINT | FK to `astrologers.astrologer_id` |
| `status` | VARCHAR(20) | Chat lifecycle state |
| `billing_status` | VARCHAR(20) | Billing lifecycle state |
| `rate_per_minute` | DECIMAL(10,2) | Immutable rate snapshot |
| `currency` | VARCHAR(3) | `INR` |
| `commission_percentage` | DECIMAL(5,2) | Commission snapshot, if used |
| `requested_at` | TIMESTAMPTZ | Request creation time |
| `expires_at` | TIMESTAMPTZ | Pending request expiry |
| `accepted_at` | TIMESTAMPTZ nullable | Astrologer acceptance |
| `billing_started_at` | TIMESTAMPTZ nullable | Billing start |
| `ended_at` | TIMESTAMPTZ nullable | Billing stop |
| `ended_by_user_id` | BIGINT nullable | Actor who ended session |
| `end_reason` | VARCHAR(50) nullable | End reason |
| `billable_minutes` | INT | Final billable minutes |
| `gross_amount` | DECIMAL(18,2) | Total customer charge |
| `platform_commission` | DECIMAL(18,2) | Platform share |
| `astrologer_earning` | DECIMAL(18,2) | Astrologer share |
| `last_billed_minute` | INT | Last successfully billed interval |
| `created_at`, `updated_at` | TIMESTAMPTZ | Audit timestamps |

Indexes:
- `(customer_user_id, requested_at DESC)`
- `(astrologer_id, status, requested_at DESC)`
- `(status, expires_at)` for pending expiry worker
- `(billing_status, billing_started_at)` for billing worker

Foreign keys should reference existing `users.user_id` and `astrologers.astrologer_id` using `BigInt`.

### 7.2 `chat_messages`

Suggested fields:

- `chat_message_id` UUID primary key.
- `chat_session_id` UUID FK.
- `sender_user_id` BIGINT FK to `users.user_id`.
- `message_type` VARCHAR(20): `TEXT`, `IMAGE`, `FILE`, `VOICE`.
- `message_text` TEXT nullable.
- `attachment_id` UUID nullable.
- `client_message_id` VARCHAR(100) for client retry deduplication.
- `sent_at` TIMESTAMPTZ.
- `edited_at` TIMESTAMPTZ nullable, if editing is allowed.
- `deleted_at` TIMESTAMPTZ nullable, for soft-delete/moderation only.
- `created_at` TIMESTAMPTZ.

Constraints/indexes:
- Unique `(sender_user_id, client_message_id)` where client ID is provided.
- `(chat_session_id, sent_at, chat_message_id)` for history pagination.
- Validate sender is one of the two participants in the session in service logic and, where practical, database constraints/triggers.

### 7.3 `chat_attachments`

Suggested fields:

- `attachment_id` UUID primary key.
- `chat_session_id` UUID FK.
- `uploaded_by_user_id` BIGINT FK to `users.user_id`.
- `storage_provider` VARCHAR(30).
- `storage_key` VARCHAR(500), not a public URL.
- `original_filename` VARCHAR(255).
- `mime_type` VARCHAR(150).
- `file_size_bytes` BIGINT.
- `checksum_sha256` VARCHAR(64) nullable.
- `media_type` VARCHAR(20): `IMAGE`, `FILE`, `VOICE`.
- `duration_seconds` INT nullable for voice notes.
- `scan_status` VARCHAR(20): `PENDING`, `CLEAN`, `REJECTED`, `FAILED`.
- `created_at` TIMESTAMPTZ.

Use private object storage. The database stores object keys and metadata, not long-lived public access URLs.

### 7.4 `chat_billing_entries`

One row per billable minute/interval:

- `billing_entry_id` UUID primary key.
- `chat_session_id` UUID FK.
- `minute_number` INT.
- `amount` DECIMAL(18,2).
- `wallet_transaction_id` BIGINT nullable FK to existing `wallet_transactions`.
- `status` VARCHAR(20): `PENDING`, `CHARGED`, `FAILED`, `REFUNDED`.
- `idempotency_key` VARCHAR(150) unique.
- `billed_at` TIMESTAMPTZ nullable.
- `created_at` TIMESTAMPTZ.

Unique `(chat_session_id, minute_number)` is mandatory to prevent duplicate billing of the same interval.

### 7.5 `chat_session_events`

Append-only audit trail:

- `event_id` UUID primary key.
- `chat_session_id` UUID FK.
- `actor_user_id` BIGINT nullable FK to `users.user_id`.
- `event_type` VARCHAR(50).
- `payload` JSONB.
- `created_at` TIMESTAMPTZ.

Record request, accept, reject, expiry, activation, message moderation, billing, low balance, disconnect/reconnect and end events. Do not put secrets or sensitive payment credentials in payloads.

### 7.6 `chat_outbox_events`

Reliable event delivery:

- `outbox_event_id` UUID primary key.
- `aggregate_type` VARCHAR(50).
- `aggregate_id` VARCHAR(100).
- `event_type` VARCHAR(100).
- `payload` JSONB.
- `status` VARCHAR(20): `PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED`.
- `attempt_count` INT.
- `next_attempt_at` TIMESTAMPTZ.
- `created_at`, `published_at` TIMESTAMPTZ nullable.

Insert the outbox event in the same transaction as the state change. A worker publishes it to Socket.IO/push notification services and marks it published. This prevents a committed chat request from silently losing its notification if the process crashes.

---

## 8. Billing workflow

### 8.1 Rate snapshot

At request/session creation, read:

- `astrologers.chat_rate`
- `astrologers.commission_percentage` if commission is part of chat earnings

Store snapshots on the session. Later changes to astrologer rates must not alter an already-created session.

Validate that the rate is greater than zero and within configured business limits. Decide whether a zero rate means free chat or invalid configuration; do not assume.

### 8.2 Per-minute debit

For started-minute billing:

- Minute 1 is charged at activation/start.
- Minute 2 is charged when the second billable minute begins, and so on.
- Each minute has a deterministic key such as `chat:{sessionId}:minute:{n}`.
- Debit through the existing wallet service.
- Create the `chat_billing_entries` row and link it to the wallet transaction.
- The billing worker and end-session path must be safe if they run concurrently.
- A unique `(chat_session_id, minute_number)` plus wallet idempotency prevents duplicate charges.

**Important implementation choice:** avoid charging for a minute that has not begun. If a billing worker runs late, calculate elapsed billable intervals from server timestamps and process only intervals that have actually started and are allowed by the selected policy.

### 8.3 Insufficient funds during an active chat

1. Attempt the next interval debit.
2. If insufficient balance, mark the billing condition and stop the session.
3. Set `ended_at` to the authoritative server time.
4. Calculate final billable time only according to the documented policy and successful debits.
5. Notify both participants.
6. Do not permit continued chat messages after the session is ended.
7. Do not create a negative wallet balance.

### 8.4 Ending a session

A session can end because:

- Customer ends chat.
- Astrologer ends chat.
- Wallet funds are insufficient.
- Session is terminated by authorized admin/support.
- System safety or technical failure requires termination.

The end operation must be idempotent:
- First valid end transition sets `ended_at`.
- Later requests return the already-ended session and must not bill again.
- Stop future billing jobs.
- Calculate final summary.
- Release astrologer availability.
- Publish session-ended event through outbox.

### 8.5 Revenue and commission

If `commission_percentage` applies to chat:

- Snapshot it at session start.
- Calculate gross customer charge, platform commission and astrologer earning with a documented rounding rule.
- Store all three amounts on the session or a dedicated earning ledger.
- Do not treat customer wallet debit as proof that astrologer payout has occurred.
- Astrologer earnings/payouts should use a separate payable ledger and payout workflow if that feature is in scope.
- Never credit astrologer funds to the customer's wallet.

The current schema has `astrologers.total_earnings` and `total_chat_minutes`; these are summary fields and should be updated only as derived aggregates or through a controlled transaction. The source of truth should be immutable billing/earning entries, not a mutable total alone.

---

## 9. REST API specification

Base path: `/api/v1`

All endpoints use the existing authentication middleware and standard response envelope.

### 9.1 Customer chat APIs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/requests` | Request a chat with an astrologer |
| `GET` | `/chat/requests/:sessionId` | Get request/session state |
| `POST` | `/chat/requests/:sessionId/cancel` | Cancel pending request |
| `GET` | `/chat/sessions` | List customer's chat sessions |
| `GET` | `/chat/sessions/:sessionId` | Get session details and billing summary |
| `GET` | `/chat/sessions/:sessionId/messages` | Paginated message history |
| `POST` | `/chat/sessions/:sessionId/messages` | Send a durable message (REST fallback) |
| `POST` | `/chat/sessions/:sessionId/end` | End active chat |
| `POST` | `/chat/sessions/:sessionId/attachments/upload-url` | Request signed upload URL |
| `POST` | `/chat/sessions/:sessionId/attachments/complete` | Confirm upload and validate object |

### 9.2 Astrologer chat APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/astrologer/chat/requests` | List pending incoming requests |
| `POST` | `/astrologer/chat/requests/:sessionId/accept` | Manually accept a pending request |
| `POST` | `/astrologer/chat/requests/:sessionId/reject` | Reject a pending request |
| `GET` | `/astrologer/chat/sessions` | List astrologer's sessions |
| `POST` | `/astrologer/chat/sessions/:sessionId/end` | End active chat |
| `GET` | `/astrologer/chat/sessions/:sessionId/messages` | Read session messages |

### 9.3 Admin/support APIs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/chat/sessions` | Search sessions with filters |
| `GET` | `/admin/chat/sessions/:sessionId/events` | Audit trail |
| `POST` | `/admin/chat/sessions/:sessionId/terminate` | Authorized termination with reason |
| `GET` | `/admin/wallets/:userId/transactions` | Authorized wallet audit |
| `POST` | `/admin/wallets/:userId/credit` | Controlled manual credit |
| `POST` | `/admin/wallets/:userId/debit` | Controlled manual debit |

### 9.4 Request chat payload

```json
{
  "astrologerId": "123",
  "clientRequestId": "customer-generated-unique-id"
}
```

The server obtains `customer_user_id` from authentication. The server reads the current astrologer rate and wallet balance. The client must not provide the rate, wallet balance, billing start time or final charge.

### 9.5 Accept/reject behavior

Accept endpoint:
- Verify authenticated user maps to the target astrologer profile.
- Verify session belongs to that astrologer.
- Verify session is pending and not expired.
- Recheck availability and customer wallet eligibility.
- Atomically transition to accepted/active according to the chosen activation flow.
- Return session state and billing start timestamp.

Reject endpoint:
- Verify ownership and pending status.
- Store rejection reason code if supplied.
- No chat fee is charged for a request that never activated.
- Notify customer.

### 9.6 Message payload

```json
{
  "clientMessageId": "device-generated-unique-id",
  "messageType": "TEXT",
  "text": "Hello, I would like guidance about my career."
}
```

For media messages, the client first obtains an upload URL, uploads directly to private object storage, calls attachment completion, then sends a message referencing the validated `attachmentId`.

### 9.7 Standard error codes

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `ASTROLOGER_NOT_FOUND`
- `ASTROLOGER_UNAVAILABLE`
- `CHAT_REQUEST_EXPIRED`
- `CHAT_REQUEST_ALREADY_DECIDED`
- `CHAT_SESSION_NOT_FOUND`
- `CHAT_SESSION_NOT_ACTIVE`
- `INSUFFICIENT_BALANCE`
- `WALLET_NOT_FOUND`
- `INVALID_RATE`
- `INVALID_MESSAGE`
- `ATTACHMENT_NOT_READY`
- `ATTACHMENT_REJECTED`
- `RATE_LIMITED`
- `IDEMPOTENCY_CONFLICT`
- `INTERNAL_ERROR`

Use appropriate HTTP codes: 400 validation, 401 unauthenticated, 403 unauthorized, 404 missing resource, 409 state/idempotency conflict, 422 business validation, 429 rate limit, 500 unexpected server failure.

---

## 10. Socket.IO specification

### 10.1 Authentication

- Authenticate the Socket.IO connection using the same trusted access-token validation as REST.
- Never trust user ID, role or astrologer ID supplied in socket event payloads.
- Resolve the authenticated user and role server-side.
- Use TLS/WSS in production.
- Validate session membership before joining any chat room.

### 10.2 Rooms

- `user:{userId}` — private notifications to a user.
- `chat:{sessionId}` — only the customer and astrologer who belong to that session.
- Optional `astrologer:{astrologerId}` — private incoming request channel, joined only after server-side profile/role validation.

Do not allow arbitrary room joins based only on a client-supplied room name.

### 10.3 Server-to-client events

| Event | Recipient | Payload purpose |
|---|---|---|
| `chat:request:incoming` | Astrologer | New pending request |
| `chat:request:accepted` | Customer | Astrologer accepted |
| `chat:request:rejected` | Customer | Astrologer rejected |
| `chat:request:expired` | Both as appropriate | Request timed out |
| `chat:session:started` | Both | Session active |
| `chat:message:new` | Other participant | New persisted message |
| `chat:message:ack` | Sender | Message persisted/accepted |
| `chat:typing` | Other participant | Typing state |
| `chat:read` | Other participant | Read receipt |
| `chat:billing:update` | Both | Billable minute / balance notice |
| `chat:wallet:low` | Customer | Low-balance warning |
| `chat:session:ended` | Both | Final session state and summary |
| `chat:error` | Requesting socket | Stable error code |

### 10.4 Client-to-server events

| Event | Required data | Server validation |
|---|---|---|
| `chat:join` | `sessionId` | Authenticated participant and valid session |
| `chat:leave` | `sessionId` | Participant membership |
| `chat:message:send` | `sessionId`, `clientMessageId`, message data | Active session, participant, payload validation |
| `chat:typing` | `sessionId`, `isTyping` | Active session and participant |
| `chat:read` | `sessionId`, message cursor | Participant and message ownership/session |

Persist messages before broadcasting them. If persistence fails, do not broadcast a successful message event.

### 10.5 Delivery and reconnect

- Socket.IO is a real-time transport, not the durable source of truth.
- Messages must be stored in PostgreSQL.
- On reconnect, clients fetch missed messages using a cursor (`sent_at` plus message ID or monotonic sequence).
- Use client-generated message IDs to make retries idempotent.
- Use Redis adapter if the application runs multiple Node.js instances.
- Use the outbox worker for important state events; ephemeral typing events may be emitted directly.

---

## 11. Media, image, file and voice-note handling

### 11.1 Upload flow

1. Authenticated participant requests an upload URL for an active session.
2. Server checks session membership and upload policy.
3. Server validates declared file size and permitted MIME category.
4. Server creates a random storage key and short-lived signed upload URL.
5. Client uploads directly to private object storage.
6. Client calls completion endpoint.
7. Server checks object existence, actual size, content type and checksum where possible.
8. Malware/content scanning runs.
9. Attachment becomes available only after scan status is `CLEAN`.
10. Client sends a chat message referencing the attachment ID.
11. Server checks that attachment belongs to the same session and sender.

### 11.2 Initial configurable limits

These are proposed starting values, not facts from the existing app:

| Media | Suggested maximum |
|---|---:|
| Image | 10 MB |
| General file | 20 MB |
| Voice note | 10 MB or 5 minutes |
| Message text | 5,000 characters |

Set exact MIME allowlists based on product needs. Do not trust filename extensions or browser-provided MIME types alone.

### 11.3 Security and privacy

- Private bucket/container; block public access.
- Store object key, not permanent public URL.
- Signed download URLs with short expiry.
- Randomized storage keys; never use raw user filename as object key.
- Validate file signature/magic bytes.
- Malware scan uploaded files.
- Restrict executable and dangerous file formats.
- Apply retention/deletion policy and account-deletion requirements.
- Log access to sensitive attachments where required.
- Do not put signed URLs or private media credentials into long-lived logs.

---

## 12. Notifications and outbox processing

Use an outbox pattern for durable events such as:

- New chat request.
- Accepted/rejected/expired request.
- Chat started/ended.
- Billing debit success/failure.
- Wallet low balance.
- Refund or adjustment.

The transaction that changes the session or wallet state also inserts an outbox row. A worker claims pending rows, publishes notifications, retries transient failures with backoff and marks successful publication. Event handlers must be idempotent.

Push notifications can be integrated with the existing `user_devices` records after inspecting current notification services. Socket.IO alone is not sufficient for offline astrologers/customers.

---

## 13. Security requirements

1. Use HTTPS/WSS only in production.
2. Reuse existing authentication and role middleware.
3. Resolve user/astrologer identity from the authenticated principal.
4. Enforce participant ownership on every session, message and attachment operation.
5. Validate all request payloads with a schema validator.
6. Rate-limit chat requests, messages, uploads and wallet endpoints.
7. Apply message length, upload size and MIME limits.
8. Use parameterized SQL/Prisma queries.
9. Do not expose internal IDs or other users' private data unnecessarily.
10. Do not log OTPs, access tokens, refresh tokens, payment secrets or full sensitive KYC details.
11. Use least-privilege database and object-storage credentials.
12. Keep production secrets in a secret manager/environment configuration, not source control.
13. Configure CORS to approved origins.
14. Configure Socket.IO origin and connection limits.
15. Maintain immutable audit records for wallet and chat billing events.
16. Encrypt backups and restrict backup access.
17. Use retention rules consistent with privacy, legal and account-deletion obligations.

---

## 14. Suggested project structure

Adapt to the current repository conventions; do not duplicate existing modules.

```text
src/
  modules/
    wallet/
      wallet.routes.ts
      wallet.controller.ts
      wallet.service.ts
      wallet.repository.ts
      wallet.validation.ts
      wallet.types.ts
    chat/
      chat.routes.ts
      chat.controller.ts
      chat.service.ts
      chat.repository.ts
      chat.validation.ts
      chat.types.ts
      chat.authorization.ts
      chat-billing.service.ts
      chat-attachment.service.ts
      chat-events.service.ts
  realtime/
    socket.ts
    socket-auth.ts
    chat.socket.ts
  workers/
    chat-expiry.worker.ts
    chat-billing.worker.ts
    outbox.worker.ts
    attachment-scan.worker.ts
  infrastructure/
    storage/
    queue/
    logger/
  common/
    money/
    errors/
    validation/
    idempotency/
prisma/
  schema.prisma
  migrations/
```

If the repository already has a wallet module, extend it rather than creating another wallet module.

---

## 15. Background workers and scheduling

### 15.1 Pending request expiry worker

- Finds pending sessions past expiry.
- Uses atomic claiming/updates.
- Marks them expired.
- Releases any availability state held for the request.
- Emits outbox event.
- Never charges a session that did not activate.

### 15.2 Billing worker

- Finds active sessions requiring the next billing interval.
- Uses per-session concurrency protection.
- Calls wallet service with deterministic idempotency key.
- Writes billing entry linked to wallet transaction.
- Ends session on insufficient funds or terminal billing failure.
- Must tolerate process restart and duplicate execution.

### 15.3 Outbox worker

- Claims pending events with a lease/lock.
- Publishes to Socket.IO, push or other notification channels.
- Retries with exponential backoff and jitter.
- Moves repeatedly failing events to a dead-letter state for operator review.
- Does not drop events silently.

### 15.4 Worker deployment

Workers may run in the same Node process initially, but production deployments should avoid multiple uncoordinated timers. Use a durable queue or database-backed claiming with safe locks. Ensure only one logical billing operation per session/minute can commit.

---

## 16. Observability and audit

Capture structured logs and metrics for:

- Chat request count, acceptance, rejection and expiry.
- Time from request to decision.
- Active session count and duration.
- Wallet debit success/failure.
- Duplicate idempotency requests.
- Billing worker lag and retry count.
- Outbox backlog and oldest pending event.
- Socket connection/disconnection and reconnect rate.
- Attachment scan failures.
- API latency and error rates.

Every financial operation should be traceable from:
`chat_session_id` → `chat_billing_entries` → `wallet_transaction_id` → `wallets.wallet_id` → `users.user_id`.

Use correlation/request IDs. Avoid logging message bodies or private file URLs by default.

---

## 17. Migration and data-safety plan

**Non-negotiable:** preserve existing production data.

1. Back up the database and verify that the backup can be restored.
2. Copy the current `schema.prisma` and inspect current migrations.
3. Inspect existing wallet service, wallet transaction type values, payment flow and all code paths that update either wallet balance field.
4. Confirm whether chat or consultation tables already exist in the live database but are missing from the Prisma schema.
5. Add only new chat support tables/indexes/constraints and any explicitly approved additive wallet idempotency structure.
6. Add Prisma relations using `BigInt` foreign keys to existing user and astrologer primary keys.
7. Generate a migration in development/staging.
8. Review generated SQL manually. Reject any unapproved `DROP TABLE`, `DROP COLUMN`, destructive type conversion, table recreation or data reset.
9. Apply migration to a staging copy and run regression tests.
10. Deploy code in a backward-compatible order.
11. Apply the reviewed migration to production during a controlled deployment.
12. Verify existing user count, astrologer count, wallet count, wallet transaction count and representative balances before and after.
13. Enable chat behind a feature flag.
14. Monitor wallet reconciliation and chat billing before enabling full traffic.

Never use `prisma migrate reset` on production. Do not run `prisma db push` against production as a substitute for a reviewed migration.

### 17.1 Pre/post migration checks

Record counts and checksums/aggregates for:
- `users`
- `astrologers`
- `wallets`
- `wallet_transactions`
- `consultations`
- `user_consultation_sessions_detail`

Compare wallet balances for a sample and aggregate before/after. Do not modify historical transactions during migration.

---

## 18. Testing strategy

### 18.1 Wallet unit tests

- Successful credit.
- Successful debit.
- Insufficient balance.
- Missing wallet.
- Duplicate idempotency key.
- Same key with different request payload.
- Concurrent debits near the balance limit.
- Decimal precision and rounding.
- Payment verification retry.
- Compensating refund.

### 18.2 Chat lifecycle tests

- Customer creates request.
- Astrologer receives request.
- Astrologer accepts.
- Astrologer rejects.
- Request expires.
- Customer cancels pending request.
- Customer cannot accept/reject as astrologer.
- Wrong astrologer cannot access session.
- Two simultaneous accept calls produce one accepted session.
- Astrologer cannot accept two concurrent sessions.
- Session ends from either participant.
- Repeated end call is idempotent.

### 18.3 Billing tests

- First minute charge.
- Subsequent minute charge.
- End before next minute.
- End at minute boundary.
- Worker retry does not double debit.
- Insufficient funds stops chat.
- Billing worker and end request race safely.
- Rate change after session creation does not change snapshot.
- Refund/compensation does not duplicate.
- Commission calculation and rounding.

### 18.4 Messaging and media tests

- Text message persisted and delivered.
- Duplicate client message ID is idempotent.
- Message from nonparticipant is rejected.
- Message to ended session is rejected.
- History pagination has no duplicates/gaps.
- Image upload and clean scan.
- Disallowed MIME and oversized file rejected.
- Voice note duration validation.
- Attachment from another session cannot be attached.
- Reconnect retrieves missed messages.

### 18.5 Load and resilience tests

- Concurrent request/accept traffic.
- Multiple worker instances.
- Database connection interruption.
- Socket server restart.
- Outbox retry and dead-letter behavior.
- Large message history pagination.
- Object-storage outage.
- Billing worker restart during active sessions.

---

## 19. Deployment configuration

Suggested environment configuration (names can be adapted to the repository):

```env
CHAT_REQUEST_TIMEOUT_SECONDS=30
CHAT_BILLING_INTERVAL_SECONDS=60
CHAT_BILLING_MODE=CEIL_MINUTE
CHAT_CURRENCY=INR
CHAT_MAX_CONCURRENT_SESSIONS_PER_ASTROLOGER=1

CHAT_IMAGE_MAX_BYTES=10485760
CHAT_FILE_MAX_BYTES=20971520
CHAT_VOICE_MAX_BYTES=10485760
CHAT_VOICE_MAX_DURATION_SECONDS=300

# Configure according to the selected private object-storage provider.
CHAT_STORAGE_BUCKET=
CHAT_STORAGE_REGION=
CHAT_STORAGE_ENDPOINT=

# Use the existing Redis/queue configuration if available.
REDIS_URL=
```

Do not place actual passwords, private keys or payment secrets in this document or source control. Use the existing deployment secret-management approach.

---

## 20. Implementation phases

### Phase 0 — Existing-code audit (required before schema implementation)

Collect and inspect:

- Complete `prisma/schema.prisma`.
- Existing wallet service, controller, routes and repository.
- Existing wallet transaction creation code and transaction type values.
- Payment gateway order/verification/webhook code.
- Existing chat module, if any.
- Authentication middleware and role mapping.
- Existing Socket.IO server setup.
- Existing notification and object-storage services.
- Existing migrations and production schema state.

Deliverable: integration map, confirmed balance authority, confirmed transaction semantics and final migration plan.

### Phase 1 — Wallet hardening

- Centralize wallet mutations in existing wallet service.
- Establish authoritative balance field.
- Add idempotency.
- Make credit/debit atomic.
- Add wallet history APIs and tests.
- Verify payment top-up idempotency.

### Phase 2 — Chat request and lifecycle

- Add chat session schema and indexes.
- Add request, pending, accept, reject, cancel and expiry logic.
- Add audit and outbox events.
- Add authorization and concurrency tests.

### Phase 3 — Real-time messaging and media

- Configure authenticated Socket.IO rooms/events.
- Add text messaging and history.
- Add private uploads, scanning and signed downloads.
- Add voice-note metadata and validation.

### Phase 4 — Billing and settlement

- Integrate chat billing with the existing wallet service.
- Add billing entries and per-interval idempotency.
- Add low-balance termination and final summary.
- Add commission/earning ledger only after payout accounting requirements are confirmed.

### Phase 5 — Staging and production rollout

- Run migration review and restore test.
- Run regression, security and load tests.
- Enable behind feature flag.
- Monitor reconciliation and worker health.
- Gradually enable production traffic.

---

## 21. Acceptance criteria

The system is ready for production only when all of the following are true:

- Existing user, astrologer, wallet and wallet transaction records remain intact.
- Existing wallet operations still work and pass regression tests.
- The authoritative wallet balance field is documented and consistently maintained.
- A wallet debit cannot make balance negative.
- Retried wallet operations cannot duplicate credits/debits.
- An astrologer must manually accept or reject a request.
- A pending/expired/rejected request is not billed.
- Only one active chat per astrologer is possible if that is the approved concurrency rule.
- Chat rate and commission are snapshotted.
- Billing uses one documented rounding rule.
- Each billable interval can be charged only once.
- Billing stops reliably on session end or insufficient funds.
- Messages persist before successful delivery acknowledgement.
- Only session participants can read/send messages or access attachments.
- Media is private, validated and scanned.
- Important notifications survive application restarts through the outbox.
- Migration SQL has been reviewed and contains no unapproved destructive operations.
- Backup restore and rollback procedures have been tested.
- Monitoring and reconciliation are available.

---

## 22. Open decisions to confirm

These cannot be safely inferred from the supplied Prisma schema alone.

1. **Balance authority:** Is `wallets.balance` authoritative, with `users.wallet_balance` a mirror, or is the current service using the reverse?
2. **Billing rounding:** Started-minute ceiling billing or per-second prorating?
3. **Billing funding:** Debit each minute or reserve funds up front?
4. **Wallet transaction vocabulary:** What exact `transaction_type` values are already in production?
5. **Rate semantics:** Is `astrologers.chat_rate` definitely INR per minute?
6. **Commission:** Should `commission_percentage` be applied to chat, and at what rounding point?
7. **Concurrency:** Is one active chat per astrologer and one active chat per customer the required rule?
8. **Request timeout:** Is 30 seconds acceptable?
9. **Media policy:** Approved file types, maximum sizes, voice-note duration and retention period?
10. **Existing consultation reporting:** Must every chat also create a `user_consultation_sessions_detail` record?
11. **Astrologer earnings:** Is there already a separate earning/payout ledger or should that be designed as a separate phase?
12. **Notifications:** Which push notification provider and existing notification service should be used?

Do not finalize production billing code until decisions 1–6 have been confirmed against the actual wallet implementation and business policy.

---

## 23. Required source files for implementation

To turn this specification into code that fits the existing application, provide:

1. Existing wallet service file(s).
2. Wallet controller/routes/repository, if separate.
3. Payment order and payment verification/webhook service.
4. Existing chat module files, if any.
5. Socket.IO initialization and authentication middleware.
6. Prisma migrations or the current production schema export if it differs from `schema.prisma`.

The implementation should then produce:
- Updated `schema.prisma` with additive models and relations.
- A reviewed additive SQL/Prisma migration.
- Wallet service changes that preserve existing transaction conventions.
- Chat REST controllers/services/routes.
- Socket.IO handlers and authorization.
- Billing, expiry and outbox workers.
- Tests and deployment instructions.

**Data safety rule:** no production reset, no dropping existing wallet tables, no deleting existing data, and no unreviewed migration execution.
