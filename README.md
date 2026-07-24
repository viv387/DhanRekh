# Money Ledger 💰

High-throughput, event-driven digital wallet and immutable ledger system built with **Next.js 15, React 19, TypeScript, Prisma ORM, PostgreSQL, Redis, Kafka, Nodemailer, Docker, and GitHub Actions**.

---

## 🎯 Project Overview

Money Ledger is a production-grade backend and digital wallet application designed to handle high-concurrency peer-to-peer money transfers safely. It enforces financial accuracy using database row-level locking (`SELECT ... FOR UPDATE`), immutable double-entry ledger accounting, Redis balance caching, Kafka asynchronous event processing, structured logging, automated testing, multi-container Docker orchestration, and enterprise distributed resilience patterns.

---

## 🛠️ Complete Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js Route Handlers + Service Layer Architecture
- **Database & ORM**: PostgreSQL 16 + Prisma ORM
- **Caching & Rate Limiting**: Redis 7 (Cache-aside balance reads & sliding window rate limiter)
- **Event Streaming**: Apache Kafka + Kafkajs
- **Asynchronous Workers**: Dedicated Kafka consumers + Outbox Relay + Scheduler Worker + DLQ Monitor
- **Resilience Engine**: Transactional Outbox Pattern, Dead Letter Queues, Exponential Backoff Retries, Circuit Breakers with Prometheus Metrics
- **Multi-Currency & Exchange Rates**: Abstract `ExchangeRateProvider` Interface (Mock, OpenExchangeRates, Fallback)
- **Automated Schedulers**: Crash-Resilient Scheduled Payments (`ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`) with DB reloader
- **Security & Fraud Engine**: ML-Ready Fraud Engine (`riskScore` & `confidenceScore`), Password Reset Token Flow, 2FA
- **Observability & Tracing**: OpenTelemetry Correlation IDs (`x-correlation-id`), Structured JSON Logger, Health Probes (`/api/health`, `/api/ready`, `/api/live`), Prometheus Metrics & Grafana Dashboards

---

## 📋 Architectural Phases & Feature Matrix

### ✅ Phase 1: Core Concurrency & ACID Ledger Engine
- **ACID Transactions & Row-Level Locking**: Money transfers execute inside PostgreSQL `$transaction` blocks using `SELECT ... FOR UPDATE` raw SQL locks. Wallet IDs are ordered (`ORDER BY id ASC`) to prevent database deadlocks.
- **Immutable Double-Entry Accounting**: Every deposit, withdrawal, and transfer atomically inserts `DEBIT` and `CREDIT` entries into the `Ledger` table capturing `balanceBefore` and `balanceAfter`.
- **Idempotency Protection**: Re-submitted transaction requests check `IdempotencyKey` records to return previous results safely without double spending.
- **Redis Balance Caching**: Balance lookups hit Redis first (`balanceCache.get`) and fall back to PostgreSQL on cache miss. The cache is refreshed on every transaction commit.
- **Kafka Event Emitting**: Transactions emit structured Kafka events (`deposit.completed`, `withdraw.completed`, `transfer.completed`) to `deposits`, `withdrawals`, and `transfers` topics.
- **Sliding-Window Rate Limiting**: Money-movement endpoints enforce Redis-backed rate limiting, returning HTTP `429 Too Many Requests` when thresholds are exceeded.
- **Authentication Pipeline**: Password hashing using `bcryptjs`, JWT access & refresh token issuance, and HTTP-only cookie support.

### ✅ Phase 2: Asynchronous Event Processing & Advanced Search
- **Dedicated Kafka Workers (`npm run workers`)**: Asynchronous worker runner (`backend/workers/index.ts`) managing isolated consumer group loops (`notification-worker-group`, `analytics-worker-group`, `audit-worker-group`, `email-worker-group`).
- **Notification System with Unread Tracking**: Real-time notification generation for deposits, withdrawals, and peer transfers. Single item mark-as-read (`PATCH /api/notifications/:id`) and bulk read APIs (`PATCH /api/notifications`). Live unread badge drawer in the Dashboard UI.
- **Background Precomputed Analytics**: `analytics.worker.ts` recalculates dashboard summary metrics asynchronously on transaction events and caches results in Redis (`analytics:dashboard:${userId}`) for sub-millisecond API response times.
- **Asynchronous Audit Logging**: `audit.worker.ts` captures user actions asynchronously into the PostgreSQL `AuditLog` table without blocking HTTP API calls. User audit API exposed at `GET /api/audit`.
- **Email Confirmation Worker**: `email.worker.ts` listens to Kafka events and dispatches email receipts for deposits, withdrawals, and peer transfers using `email.service.ts` (Nodemailer).
- **Transaction Search, Filtering, Sorting & Pagination**:
  - Filter by **Type** (`DEPOSIT`, `WITHDRAW`, `TRANSFER`)
  - Filter by **Status** (`COMPLETED`, `PENDING`, `FAILED`, `REVERSED`)
  - Filter by **Amount Range** (`minAmount`, `maxAmount`)
  - Filter by **Date Range** (`startDate`, `endDate`)
  - **Sorting**: `createdAt`, `amount` (`asc`, `desc`)
  - **Pagination**: `page`, `limit`, total item count, and total page counts.
- **Complete Interactive Frontend UI**:
  - [Dashboard](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/dashboard/page.tsx): Live balance metrics, recent transactions, ledger feed, and notification drawer.
  - [Transactions](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/transactions/page.tsx): Money action forms (Deposit, Withdraw, Transfer) + search & pagination controls.
  - [Analytics](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/analytics/page.tsx): Visual distribution breakdown & financial inflow/outflow metrics.
  - [Login](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/(auth)/login/page.tsx) & [Signup](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/(auth)/signup/page.tsx): Authentication pages.

### ✅ Phase 3: Production Hardening, DevOps & Testing
- **Multi-Stage Production Dockerfile**: Optimized 3-stage container build (`deps`, `builder`, `runner`) running securely as non-root user `nextjs`.
- **Multi-Container Docker Compose (`docker-compose.yml`)**: Orchestrates 8 containers: `postgres`, `redis`, `kafka`, `zookeeper`, `app`, `workers`, `prometheus`, `grafana`.
- **GitHub Actions CI/CD Pipeline (`.github/workflows/ci.yml`)**: Automated pipeline on push/PR running linting, TypeScript compilation, test suites, Next.js build, and Docker container build validation.
- **Automated Test Suites (`npm test`)**: 100% test pass rate (`13/13 tests passed`):
  - **Unit Tests**: Auth, Password Hashing, JWT, Account Number Generator, Validators, Notification formatting, Circuit Breakers, Exchange Rates, Fraud Scoring.
  - **Integration Tests**: End-to-end API workflows & health check assertions.
  - **Concurrency Stress Tests**: Simultaneous parallel transfer tests validating PostgreSQL `SELECT ... FOR UPDATE` row locks, atomic transactions, and zero balance drift under race conditions.
  - **k6 Load Testing**: Load test script (`tests/load/k6-load-test.js`) for measuring throughput (TPS), latency (p95, p99), and error rates.
- **Structured JSON Logging**: JSON logger (`backend/utils/logger.ts`) emitting timestamped ISO logs with levels (`info`, `warn`, `error`), correlation IDs, duration metrics (ms), and context metadata.
- **Health Check Probes**:
  - `/api/health`: Liveness probe (uptime, environment).
  - `/api/ready`: Readiness probe (PostgreSQL & Redis ping).
  - `/api/live`: Deep health check (PostgreSQL DB, Redis cache, Kafka status).

### ✅ Phase 4: Enterprise Distributed Systems, Fault Tolerance & Fintech Features
- **Transactional Outbox Pattern**: Dual-write DB/Kafka atomicity via `Outbox` model with explicit states (`PENDING`, `RETRYING`, `PUBLISHED`, `FAILED`) and `outbox-relay.worker.ts`.
- **Dead Letter Queue (DLQ) & Replay Engine**: Stores unprocessable message failures in `DeadLetterMessage` and exposes manual recovery endpoint `POST /api/dlq/replay`.
- **Exponential Backoff & Circuit Breakers**:
  - Exponential backoff wrapper with jitter (`backend/utils/retry.ts`).
  - Circuit Breakers (`backend/utils/circuit-breaker.ts`) with Prometheus state metrics (`openCount`, `halfOpenCount`, `closedCount`, `state`).
- **Distributed Tracing**: OpenTelemetry correlation IDs (`x-correlation-id`) propagating across HTTP, Redis, Kafka, and background workers.
- **Multi-Currency Wallets**: `ExchangeRateProvider` interface (`OpenExchangeRatesProvider` -> `FallbackExchangeRateProvider`) supporting USD, EUR, GBP, INR, JPY and currency conversion API (`POST /api/wallet/convert`).
- **Crash-Resilient Scheduled Payments**: Automated one-time and recurring transfers (`ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`) managed by `scheduler.worker.ts` that reloads active jobs from PostgreSQL upon application restart.
- **Rule-Based Fraud Engine**: Multi-metric risk detection (`riskScore` 0-100 and `confidenceScore` 0-100%) flagging high-velocity, large-amount, and balance-depletion anomalies into `FraudAlert` logs.
- **Advanced Security**: Password recovery tokens (`/api/auth/forgot-password`, `/api/auth/reset-password`), 2FA secret generation (`/api/auth/2fa`), and email verification.

---

## 🗄️ Complete Database Schema & Models (`schema.prisma`)

```prisma
enum WalletStatus { ACTIVE, SUSPENDED, CLOSED }
enum TransactionType { DEPOSIT, WITHDRAW, TRANSFER, CONVERSION }
enum TransactionStatus { PENDING, COMPLETED, FAILED, REVERSED }
enum LedgerEntryType { DEBIT, CREDIT }
enum OutboxStatus { PENDING, PUBLISHED, FAILED, RETRYING }
enum ScheduledFrequency { ONCE, DAILY, WEEKLY, MONTHLY }

User (id, username, email, phone, passwordHash, isEmailVerified, twoFactorEnabled, twoFactorSecret, createdAt, updatedAt)
 ├── Wallet (id, userId, accountNumber, balance, currency, status, createdAt)
 ├── RefreshToken (id, userId, refreshToken, expiresAt, createdAt)
 ├── IdempotencyKey (id, userId, transactionId, idempotencyKey, createdAt)
 ├── AuditLog (id, userId, action, ipAddress, userAgent, createdAt)
 ├── Notification (id, userId, title, message, isRead, createdAt)
 ├── CurrencyConversion (id, userId, walletId, fromCurrency, toCurrency, fromAmount, toAmount, rate, createdAt)
 ├── ScheduledPayment (id, userId, senderWalletId, receiverAccountNumber, amount, currency, frequency, nextRunAt, status, createdAt)
 ├── FraudAlert (id, userId, transactionId, riskScore, confidenceScore, reasons, status, createdAt)
 └── PasswordResetToken (id, userId, token, expiresAt, createdAt)

Transaction (id, senderWalletId, receiverWalletId, amount, transactionType, status, description, createdAt)
 └── Ledger (id, transactionId, walletId, entryType, amount, balanceBefore, balanceAfter, createdAt)

Outbox (id, aggregateType, aggregateId, eventType, payload, status, retryCount, createdAt, processedAt)
DeadLetterMessage (id, topic, consumerGroup, payload, errorReason, status, createdAt, replayedAt)
```

---

## 🔌 Complete API Reference Table

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Create user account & auto-generate wallet | Public |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT tokens | Public |
| `GET` | `/api/auth/me` | Get current authenticated session user | Bearer / Cookie |
| `POST` | `/api/auth/refresh` | Renew expired access token | Cookie |
| `POST` | `/api/auth/logout` | Revoke refresh token & sign out | Cookie |
| `POST` | `/api/auth/forgot-password` | Generate password reset token | Public |
| `POST` | `/api/auth/reset-password` | Reset account password using token | Public |
| `POST` | `/api/auth/2fa` | Enable 2FA & generate secret | Required |
| `GET` | `/api/wallet` | Get wallet & cached balance | Required |
| `POST` | `/api/wallet` | Initialize wallet for user | Required |
| `POST` | `/api/wallet/convert` | Convert wallet funds between currencies | Required |
| `POST` | `/api/transaction/deposit` | Deposit funds (ACID transaction + Kafka event) | Required |
| `POST` | `/api/transaction/withdraw` | Withdraw funds (Sufficient balance check + Lock) | Required |
| `POST` | `/api/transaction/transfer` | Peer-to-peer transfer (Row locking + Double Entry) | Required |
| `GET` | `/api/transactions` | Search & filter transactions with pagination | Required |
| `GET` | `/api/transactions/scheduled` | List user's active scheduled payments | Required |
| `POST` | `/api/transactions/scheduled` | Create scheduled transfer (`ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`) | Required |
| `GET` | `/api/ledger` | Get immutable double-entry ledger history | Required |
| `GET` | `/api/analytics` | Get precomputed Redis dashboard analytics summary | Required |
| `GET` | `/api/notifications` | List user notifications & unread count | Required |
| `PATCH` | `/api/notifications` | Mark all user notifications as read | Required |
| `PATCH` | `/api/notifications/:id` | Mark specific notification as read | Required |
| `GET` | `/api/audit` | Get user audit log history | Required |
| `GET` | `/api/fraud/alerts` | Get user fraud risk & confidence alerts | Required |
| `GET` | `/api/dlq/replay` | List DLQ failed messages | Required |
| `POST` | `/api/dlq/replay` | Replay DLQ failed message into Kafka worker | Required |
| `GET` | `/api/health` | Service liveness probe (uptime & status) | Public |
| `GET` | `/api/ready` | Readiness probe (PostgreSQL & Redis status) | Public |
| `GET` | `/api/live` | Deep system health probe (PostgreSQL, Redis, Kafka) | Public |

---

## 🏃 Running Locally

```bash
# 1. Install & Database Setup
npm install
npx prisma generate
npx prisma db push

# 2. Start Next.js Web App
npm run dev

# 3. Start All Background Workers (Consumers, Relay, Scheduler)
npm run workers

# 4. Run Automated Test Suites
npm test

# 5. Run Production Build
npm run build
```

---

## 🐳 Running with Docker Compose

```bash
docker compose up --build
```

- **Next.js Application**: [http://localhost:3000](http://localhost:3000)
- **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)
- **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) (User: `admin`, Password: `admin`)
