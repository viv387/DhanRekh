# Money Ledger

High-throughput wallet and ledger system built with Next.js, Prisma, PostgreSQL, Redis-ready abstractions, and a ledger-first money movement flow.

## What Has Been Built

The project now contains the core pieces of a production-style digital wallet system:

- Auth flow with signup, login, refresh, logout, and current-user lookup
- JWT-based session handling with access and refresh tokens
- Wallet creation and wallet lookup for the authenticated user
- Deposit, withdraw, and transfer flows with idempotency protection
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
- frontend pages for wallet, transactions, and dashboard

Next natural expansions would be notifications, stronger audit reporting, Redis caching, Kafka workers, and production deployment hardening.
