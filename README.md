# Money Ledger

High-throughput wallet and ledger system built with Next.js, Prisma, PostgreSQL, Redis-ready abstractions, and a ledger-first money movement flow.

## Objective

Transform the current wallet into a production-style backend emphasizing concurrency, performance, and scalability.

## Phase 1 Hardening Goals

### 1. ACID Transactions with Row-Level Locking

Use PostgreSQL transactions with row-level locking so money movement stays consistent under concurrent requests.

- Balance reads and writes happen inside a single database transaction.
- Wallet rows are locked during deposit, withdraw, and transfer operations.
- This prevents double spending and race conditions.

### 2. Redis Balance Cache

Cache wallet balances in Redis so reads can hit cache first and fall back to PostgreSQL on a miss.

- Wallet balance reads prefer Redis.
- The cache is refreshed after every successful deposit, withdraw, and transfer.
- If Redis is unavailable, the app falls back to PostgreSQL instead of failing the money flow.

### 3. Kafka Event Processing

Publish a Kafka event after every successful transaction.

- Events are emitted for deposits, withdrawals, and transfers.
- Each event includes transaction metadata such as IDs, amount, wallet references, and timestamp.
- These events are the foundation for asynchronous notifications, analytics, and audit processing.

### 4. Background Workers

Use Kafka consumers to process non-critical tasks asynchronously.

- Notification work can be moved out of the request path.
- Analytics aggregation can be done in the background.
- Audit logging and future email services can be attached to the same event stream.

### 5. Redis Rate Limiting

Protect money-movement APIs with Redis-based rate limiting.

- Transfer requests can be capped more tightly than general money movement traffic.
- A user that exceeds the configured threshold gets an HTTP 429 response.
- The limiter is Redis-backed and atomic.

## Phase 1 Deliverables

- Safe concurrent transfers
- Redis caching for wallet balances
- Kafka producer integration
- Background worker skeletons
- Redis rate limiting
- Production-ready backend foundation

## What Has Been Built

The project now contains the core pieces of a production-style digital wallet system:

- Auth flow with signup, login, refresh, logout, and current-user lookup
- JWT-based session handling with access and refresh tokens
- Wallet creation and wallet lookup for the authenticated user
- Deposit, withdraw, and transfer flows with idempotency protection
- ACID transaction handling with row-level locking on wallet updates
- Redis balance caching for wallet reads and post-commit cache refreshes
- Kafka event publishing after successful deposits, withdrawals, and transfers
- Redis-backed rate limiting for money-movement APIs
- Immutable ledger entries written alongside every money movement
- Transaction history and ledger history endpoints
- Analytics summary endpoint for dashboard data
- A dashboard UI that reads the analytics endpoint and shows balances, totals, recent transactions, and ledger activity
- Wallet and transaction UI pages that can call the existing APIs
- Prisma schema for users, wallets, transactions, ledger entries, idempotency keys, audit logs, refresh tokens, and notifications

## Current Flow

The system is intentionally organized around a single money source of truth: the wallet balance and its ledger entries.

### 1. Authentication Flow

1. The user signs up or logs in through the auth endpoints.
2. The server validates input with `zod`.
3. Passwords are hashed with `bcryptjs`.
4. The server issues:
	- an access token for short-lived authentication
	- a refresh token for session renewal
5. Both tokens are stored as HTTP-only cookies.
6. `GET /api/auth/me` reads the current session and returns the authenticated user.

### 2. Wallet Flow

1. After authentication, the app checks whether the user already has a wallet.
2. If not, `POST /api/wallet` creates one.
3. A wallet gets:
	- a unique account number
	- an initial zero balance
	- a currency code
	- an active status
4. `GET /api/wallet` returns the authenticated user’s wallet.

### 3. Deposit Flow

1. The client sends a deposit request with amount, optional description, and idempotency key.
2. The server verifies the authenticated user and looks up that user’s wallet.
3. The wallet balance is increased inside a database transaction.
4. A transaction record is inserted.
5. A ledger entry is inserted with the balance before and after the deposit.
6. The idempotency key is stored so the same request cannot be applied twice.

### 4. Withdraw Flow

1. The client sends a withdrawal request with amount, optional description, and idempotency key.
2. The server loads the user wallet.
3. The balance is checked to make sure there are sufficient funds.
4. The wallet is debited inside the same database transaction.
5. A transaction record and a debit ledger entry are written.
6. The idempotency key is persisted.

### 5. Transfer Flow

1. The client sends the receiver account number, amount, optional description, and idempotency key.
2. The server resolves both sender and receiver wallets.
3. The sender balance is checked before transfer.
4. The sender wallet is debited and the receiver wallet is credited inside one transaction.
5. A transfer transaction record is created.
6. Two ledger entries are written:
	- one debit for the sender
	- one credit for the receiver
7. The idempotency key is stored.

### 6. Read Flow

1. `GET /api/transactions` returns the wallet’s transaction history.
2. `GET /api/ledger` returns immutable ledger entries.
3. `GET /api/analytics` returns a dashboard summary for the authenticated user.
4. The dashboard page reads this endpoint and renders the live account view.

## Data Model

The Prisma schema currently includes these tables and roles:

- `User` for identity and auth fields
- `Wallet` for account number, balance, currency, and status
- `Transaction` for deposits, withdrawals, and transfers
- `Ledger` for immutable accounting entries
- `IdempotencyKey` for safe retry protection
- `AuditLog` for security and activity tracking
- `RefreshToken` for session renewal
- `Notification` for future alerts and event messaging

## API Surface

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Wallet

- `GET /api/wallet`
- `POST /api/wallet`

### Money Movement

- `POST /api/transaction/deposit`
- `POST /api/transaction/withdraw`
- `POST /api/transaction/transfer`

### Read APIs

- `GET /api/transactions`
- `GET /api/ledger`
- `GET /api/analytics`

## Frontend Pages

- `/` redirects to `/dashboard`
- `/dashboard` shows the summary cards and recent activity
- `/wallet` shows wallet creation and wallet details
- `/transactions` provides deposit, withdraw, and transfer forms

## Important Design Choices

- Wallet balance changes are always tied to a transaction record.
- Every transaction creates ledger entries so the account can be audited later.
- Idempotency keys prevent duplicate money movements on retries.
- Auth tokens are stored as HTTP-only cookies instead of being exposed in client state.
- The dashboard is read-only and driven by the analytics API, not by hardcoded values.
- PostgreSQL is treated as the source of truth while Redis accelerates reads and limits abuse.
- Kafka carries transaction events to downstream workers without slowing the request path.
- The backend is structured so additional workers and processors can be attached later without changing the core API contract.

## Running The Project

1. Install dependencies.
2. Set your `DATABASE_URL` in `.env`.
3. Generate the Prisma client.
4. Run the dev server.

Example:

```bash
pnpm install
pnpm prisma generate --config prisma.config.ts
pnpm dev
```

## Status

The project currently has a working foundation for:

- authentication
- wallet creation and retrieval
- deposit / withdraw / transfer flows
- immutable ledger logging
- dashboard analytics
- row-level locking for money movements
- Redis balance caching
- Kafka event publishing
- Redis rate limiting
- frontend pages for wallet, transactions, and dashboard

Next natural expansions would be worker implementations for notifications, analytics rollups, and audit sinks; plus deployment hardening, monitoring, and queue observability.
