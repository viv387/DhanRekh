# Money Ledger — System Analysis & Detailed README Documentation

```markdown
# 🏦 Money Ledger — High-Throughput Digital Wallet & Distributed Immutable Ledger System

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16.0-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.9-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Redis 7](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-7.6-231F20?style=for-the-badge&logo=apachekafka)](https://kafka.apache.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

---

## 📌 Executive Overview

**Money Ledger** is an enterprise-grade, fault-tolerant financial engine and digital wallet backend designed for ultra-low latency, high-concurrency peer-to-peer (P2P) payments, multi-currency balance management, real-time fraud detection, and immutable double-entry ledger bookkeeping.

Engineered with fintech-standard **ACID compliance**, the system mathematically guarantees zero balance drift under extreme race conditions using **PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`)** with deterministic lock ordering, **Double-Entry Accounting**, **Redis Cache-Aside Invalidation & Sliding-Window Rate Limiting**, and **Apache Kafka Event-Driven Worker Orchestration**.

---

## 🏗️ System Architecture & Data Flow

```
                                  +---------------------------------------+
                                  |         Next.js 16 Web & API          |
                                  |     (React 19 + Tailwind CSS 4)       |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |   HTTP Route Handlers / API Layer     |
                                  |  (JWT Auth, Zod Validation, Rate Lim) |
                                  +---------------------------------------+
                                           /          |          \
                                          /           |           \
                                         v            v            v
      +------------------------------------+  +---------------+  +-----------------------------------+
      | PostgreSQL 16 (Source of Truth)    |  | Redis 7       |  | Apache Kafka (Event Bus)          |
      | - Wallet Balances                  |  | - Balance     |  | - money-ledger.transactions       |
      | - Immutable Ledger Entries         |  |   Cache       |  | - money-ledger.analytics          |
      | - Transactional Outbox             |  | - Rate Limits |  | - money-ledger.audit              |
      | - Fraud Alerts & Audit Logs        |  | - Pre-calc    |  | - money-ledger.notifications      |
      +------------------------------------+  |   Analytics   |  +-----------------------------------+
                                              +---------------+                    |
                                                                                   v
                                                                 +-----------------------------------+
                                                                 | Async Worker Processes            |
                                                                 | - Outbox Relay Worker             |
                                                                 | - Analytics Worker                |
                                                                 | - Notification Worker             |
                                                                 | - Email Worker                    |
                                                                 | - Audit Worker                    |
                                                                 | - Scheduler Worker                |
                                                                 +-----------------------------------+
```

### Architectural Principles:
1. **Financial Precision**: All monetary values are processed using exact fixed-point `Decimal(18, 2)` arithmetic (stored in PostgreSQL via Prisma's `Decimal` type) to avoid floating-point rounding errors.
2. **Double-Entry Bookkeeping**: Every transaction automatically balance-checks by creating paired `DEBIT` and `CREDIT` entries containing immutable snapshots of `balanceBefore` and `balanceAfter`.
3. **Deadlock Prevention**: Concurrency locks on sender and receiver wallets are consistently acquired in strict lexicographical order (`ORDER BY id ASC`), avoiding relational database deadlocks during bidirectional concurrent transfers.
4. **Transactional Outbox Pattern**: Database writes and event publishing occur atomically in a single database transaction using an `Outbox` queue table, ensuring zero lost events if Kafka is temporarily unreachable.
5. **Graceful Degraded Mode**: If Redis or Kafka services experience outage, the application automatically bypasses caches/queues and operates synchronously against PostgreSQL without system crashes or data loss.

---

## ⚡ Core Technical Features

### 1. Concurrency Control & Anti-Deadlock Engine
- **Raw SQL Row-Level Locking**: Executes `SELECT * FROM wallets WHERE id IN ($1, $2) ORDER BY id ASC FOR UPDATE` inside PostgreSQL transaction blocks.
- **Strict Execution Ordering**: Enforces wallet lock sorting so concurrent transfers between Alice & Bob never produce deadlock conditions.
- **Atomic Balance Updates**: Solves race conditions during rapid deposits, withdrawals, and parallel peer transfers.

### 2. Double-Entry Accounting System
- Direct manipulation of wallet balances without corresponding ledger entries is strictly prohibited.
- For every completed transaction, the system records:
  - **DEBIT Entry**: Sender wallet balance reduction with `balanceBefore` and `balanceAfter`.
  - **CREDIT Entry**: Receiver wallet balance addition with `balanceBefore` and `balanceAfter`.
- Provides 100% auditability and mathematical proof of funds integrity.

### 3. Distributed Idempotency Protection
- Supports client-supplied `Idempotency-Key` HTTP headers.
- Stores key bindings in `IdempotencyKey` records associated with transactions.
- Re-executing a request with an existing key immediately returns the cached transaction response, preventing double-debitting on network retries.

### 4. Redis Speed & Security Layer
- **Wallet Balance Caching**: Uses Cache-Aside pattern (`wallet:balance:${walletId}`) with active cache invalidation on successful DB commits.
- **Sliding-Window Rate Limiting**: Atomic Redis scripts track IP & user request frequencies (`money-move:transfer:${userId}` capped at 5 req/min; money movements capped at 30 req/min).
- **Pre-calculated Dashboard Analytics**: Background analytics worker stores calculated user statistics in Redis (`analytics:dashboard:${userId}`) with a 300-second TTL to avoid costly SQL aggregate queries on live dashboards.

### 5. Event-Driven Asynchronous Workers
Run independently via `npm run workers`:
- **`outbox-relay.worker.ts`**: Polls pending events from the `Outbox` table and publishes them to Kafka topics, updating outbox status to `PUBLISHED`.
- **`analytics.worker.ts`**: Consumes transaction events and updates precomputed Redis metrics.
- **`notification.worker.ts`**: Consumes payment events and pushes in-app notifications to users.
- **`email.worker.ts`**: Handles asynchronous transactional email delivery via Nodemailer SMTP.
- **`audit.worker.ts`**: Logs system activities asynchronously into the `AuditLog` table.
- **`scheduler.worker.ts`**: Cron-style processor executing active recurring `ScheduledPayment` items (DAILY, WEEKLY, MONTHLY).

### 6. Rule-Based Fraud Detection Engine
- Calculates real-time transaction risk scores (0–100) and confidence metrics.
- **Rules evaluated**:
  - **High-Value Threshold**: Flags single transactions exceeding normal limits.
  - **Velocity Spike**: Flags multiple transfers within short time windows.
  - **Wallet Drain**: Flags transactions that consume >90% of total wallet balance.
- High-risk transactions trigger `FraudAlert` records for admin review.

### 7. Resilient Multi-Currency Exchange Engine
- Multi-currency conversion supporting USD, EUR, GBP, JPR, INR, etc.
- Equipped with **Circuit Breaker Pattern** (`open`, `half-open`, `closed`) to fallback to cached or secondary exchange rate providers if external exchange APIs fail.

### 8. Enterprise Resilience & Observability
- **Dead Letter Queue (DLQ)**: Failed Kafka messages shift to `DeadLetterMessage` with manual inspection and HTTP replay capabilities (`POST /api/dlq/replay`).
- **Prometheus & Grafana Monitoring**: Out-of-the-box dashboards tracking request rates, database pool metrics, Kafka message lag, and circuit status.
- **Health Check Suite**: Enterprise health endpoints (`/api/health`, `/api/ready`, `/api/live`) for Kubernetes/Render readiness and liveness probes.

---

## 🗄️ Database Schema & Data Models

The relational schema is built on **PostgreSQL** and managed through **Prisma ORM** (`backend/prisma/schema.prisma`):

| Model Name | Table Name | Purpose | Key Attributes / Relations |
| :--- | :--- | :--- | :--- |
| `User` | `users` | User authentication & profile management | `id` (UUID), `email`, `username`, `phone`, `passwordHash`, `twoFactorEnabled` |
| `Wallet` | `wallets` | Multi-currency digital wallet account | `id` (UUID), `userId` (1:1 User), `accountNumber`, `balance` (Decimal), `currency`, `status` |
| `Transaction` | `transactions` | Master record of transfer / deposit / withdrawal | `id` (UUID), `senderWalletId`, `receiverWalletId`, `amount`, `transactionType`, `status` |
| `Ledger` | `ledger` | Double-entry balance change journal | `id` (UUID), `transactionId`, `walletId`, `entryType` (DEBIT/CREDIT), `balanceBefore`, `balanceAfter` |
| `Outbox` | `outbox` | Transactional Outbox queue for event streaming | `id` (UUID), `aggregateType`, `aggregateId`, `eventType`, `payload`, `status`, `retryCount` |
| `DeadLetterMessage` | `dead_letter_messages` | DLQ storage for unprocessable Kafka events | `id` (UUID), `topic`, `consumerGroup`, `payload`, `errorReason`, `status`, `replayedAt` |
| `CurrencyConversion` | `currency_conversions` | Historical currency conversion operations | `id` (UUID), `userId`, `walletId`, `fromCurrency`, `toCurrency`, `fromAmount`, `toAmount`, `rate` |
| `ScheduledPayment` | `scheduled_payments` | Automated recurring payment rules | `id` (UUID), `userId`, `senderWalletId`, `receiverAccountNumber`, `amount`, `frequency`, `nextRunAt` |
| `FraudAlert` | `fraud_alerts` | Risk engine flagged security transactions | `id` (UUID), `userId`, `transactionId`, `riskScore`, `confidenceScore`, `reasons`, `status` |
| `IdempotencyKey` | `idempotency_keys` | API duplicate execution prevention | `id` (UUID), `userId`, `transactionId`, `idempotencyKey` (Unique) |
| `AuditLog` | `audit_logs` | Security & activity audit history | `id` (UUID), `userId`, `action`, `ipAddress`, `userAgent` |
| `RefreshToken` | `refresh_tokens` | JWT refresh session store | `id` (UUID), `userId`, `refreshToken` (Unique), `expiresAt` |
| `Notification` | `notifications` | In-app user notifications | `id` (UUID), `userId`, `title`, `message`, `isRead` |

---

## 🚀 API Endpoint Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/signup` — Register new user and auto-generate default wallet with account number.
- `POST /api/auth/login` — Authenticate user and issue JWT Access & Refresh tokens.
- `POST /api/auth/refresh` — Refresh expired Access Token using valid Refresh Token.
- `POST /api/auth/logout` — Revoke active refresh token.
- `GET  /api/auth/me` — Fetch current authenticated user profile & wallet overview.
- `POST /api/auth/2fa/setup` — Generate TOTP secret and QR code for 2FA onboarding.
- `POST /api/auth/2fa/verify` — Enable 2FA after token verification.
- `POST /api/auth/forgot-password` — Initiate password reset email token.
- `POST /api/auth/reset-password` — Complete password reset using valid reset token.

### Wallet & Balance (`/api/wallet`)
- `GET  /api/wallet` — Retrieve authenticated user's wallet details & balance.
- `POST /api/wallet/convert` — Execute real-time currency conversion on wallet funds.

### Money Movements & Transactions (`/api/transaction`)
- `POST /api/transaction/deposit` — Deposit funds into authenticated wallet (Requires `amount`, `currency`).
- `POST /api/transaction/withdraw` — Withdraw funds from wallet (Requires `amount`, `currency`).
- `POST /api/transaction/transfer` — P2P transfer (Requires `receiverAccountNumber`, `amount`, optional `Idempotency-Key` header).
- `GET  /api/transactions` — Paginated transaction history with filters (`type`, `status`, `startDate`, `endDate`, `minAmount`, `maxAmount`).
- `GET  /api/transactions/[id]` — Retrieve detailed transaction breakdown with double-entry ledger items.

### Ledger & Analytics (`/api/ledger`, `/api/analytics`)
- `GET  /api/ledger` — Detailed immutable double-entry ledger records.
- `GET  /api/analytics/dashboard` — Precalculated user transaction metrics (Redis cached).
- `GET  /api/audit` — User audit security log entries.
- `GET  /api/fraud` — Fraud alerts flagged for user transactions.
- `GET  /api/notifications` — Fetch user in-app notifications.

### Systems Operations & Operational Resilience (`/api/dlq`, `/api/health`)
- `GET  /api/dlq` — List dead-letter queue messages.
- `POST /api/dlq/replay` — Trigger manual event replay for failed DLQ messages.
- `GET  /api/health` — Full system component health report (DB, Redis, Kafka).
- `GET  /api/ready` — Deployment readiness probe.
- `GET  /api/live` — Basic application liveness probe.

---

## 🛠️ Environment Configuration Reference

Create a `.env` file in `my-app/` based on `.env.example`:

| Variable Name | Default / Sample Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/money_ledger?schema=public` | PostgreSQL connection string (ACID store) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL for caching & rate limiting |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `money-ledger` | Kafka client identifier |
| `KAFKA_SASL_USERNAME` | `""` | Optional SASL username for Upstash / Confluent Kafka |
| `KAFKA_SASL_PASSWORD` | `""` | Optional SASL password for Upstash / Confluent Kafka |
| `JWT_ACCESS_SECRET` | `32+ character random string` | Secret used to sign JWT Access Tokens |
| `JWT_REFRESH_SECRET` | `32+ character random string` | Secret used to sign JWT Refresh Tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Lifetime of short-lived Access Tokens |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Lifetime of Refresh Tokens |
| `BCRYPT_ROUNDS` | `10` | Password hashing salt iterations |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Time window for API rate limiter |
| `TRANSFER_RATE_LIMIT` | `5` | Maximum transfers allowed per window |
| `MONEY_MOVEMENT_RATE_LIMIT` | `30` | Maximum deposits/withdrawals allowed per window |
| `SMTP_HOST` | `smtp.example.com` | SMTP host for Nodemailer transactional emails |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | `user@example.com` | SMTP username |
| `SMTP_PASSWORD` | `secret` | SMTP password |
| `MAIL_FROM` | `Money Ledger <no-reply@money-ledger.app>` | Email Sender address |
| `NODE_ENV` | `development` | Runtime environment (`development` / `production` / `test`) |

---

## 💻 Local Setup & Installation Guide

### Prerequisites
- **Node.js**: v20.x or higher
- **Package Manager**: `npm` (v10+) or `pnpm`
- **Docker Desktop**: Installed and running (for PostgreSQL, Redis, Kafka, Zookeeper, Prometheus, Grafana)

### Step-by-Step Setup

1. **Clone the repository and enter the application workspace**:
   ```bash
   cd my-app
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start the Infrastructure Stack via Docker Compose**:
   ```bash
   docker-compose up -d postgres redis zookeeper kafka prometheus grafana
   ```

5. **Run Prisma Migrations & Client Generation**:
   ```bash
   npm run db:push
   npm run db:generate
   ```

6. **Start the Async Background Workers**:
   In a separate terminal tab:
   ```bash
   npm run workers
   ```

7. **Start the Next.js Development Server**:
   ```bash
   npm run dev
   ```

8. **Access Application & Observability Dashboards**:
   - **Next.js Web App**: `http://localhost:3000`
   - **API Health Check**: `http://localhost:3000/api/health`
   - **Prometheus Metrics**: `http://localhost:9090`
   - **Grafana Monitoring**: `http://localhost:3001` (Credentials: `admin` / `admin`)

---

## 🧪 Testing & Verification Suite

Money Ledger contains an automated test harness validating financial accuracy, API contracts, unit logic, and concurrency race conditions:

```bash
# Run unit test suite (Auth, Wallet, Notification, Phase4 Services)
npm run test:unit

# Run API integration tests
npm run test:integration

# Run concurrency stress tests (simulates parallel race conditions & row locks)
npm run test:concurrency

# Run ALL automated tests in sequence
npm test
```

### Test Suite Coverage:
- **`auth.service.test.ts`**: Verifies password hashing, JWT issuance, and login validation.
- **`wallet.service.test.ts`**: Verifies balance mutations and double-entry ledger record generation.
- **`notification.service.test.ts`**: Validates in-app alert dispatches and reading state transitions.
- **`concurrency.test.ts`**: Fires simultaneous parallel transfer requests to verify zero balance drift and deadlock immunity.
- **`api.integration.test.ts`**: Full HTTP API integration test covering register, login, deposit, transfer, and history queries.

---

## 🐳 Docker Stack & Production Deployment

The project provides a multi-stage `Dockerfile` and comprehensive `docker-compose.yml`:

### Launching Full Stack in Containers
```bash
docker-compose up --build -d
```

### Stack Services:
- `money_ledger_postgres`: PostgreSQL 16 Alpine on port `5432`
- `money_ledger_redis`: Redis 7 Alpine on port `6379`
- `money_ledger_zookeeper`: Zookeeper 7.6 on port `2181`
- `money_ledger_kafka`: Apache Kafka 7.6 on port `9092`
- `money_ledger_app`: Next.js 16 Web Application on port `3000`
- `money_ledger_workers`: Background Worker Runner (`npm run workers`)
- `money_ledger_prometheus`: Prometheus Monitoring on port `9090`
- `money_ledger_grafana`: Grafana Dashboards on port `3001`

---

## 📁 Repository Directory Structure

```
my-app/
├── app/                        # Next.js 16 App Router pages & API handlers
│   ├── api/                    # REST API route handlers
│   │   ├── analytics/          # Dashboard analytics route
│   │   ├── audit/              # Audit trail route
│   │   ├── auth/               # Auth, 2FA, Password Reset routes
│   │   ├── dlq/                # Dead-letter queue & replay routes
│   │   ├── fraud/              # Fraud alerts route
│   │   ├── health/             # System health probes (health, ready, live)
│   │   ├── ledger/             # Immutable double-entry ledger query routes
│   │   ├── notifications/      # In-app notifications route
│   │   ├── transaction/        # Deposit, Withdraw, Transfer routes
│   │   ├── transactions/       # Transaction search & history
│   │   └── wallet/             # Wallet overview & currency conversion
│   ├── layout.tsx              # Root HTML & Tailwind layout
│   └── page.tsx                # Client dashboard UI entrypoint
├── backend/                    # Core Business & Infrastructure Services
│   ├── config/                 # App configuration constants
│   ├── controllers/            # Controller helper functions
│   ├── kafka/                  # Kafka producer, consumer & client configuration
│   ├── middleware/             # Rate limiter & JWT auth middlewares
│   ├── prisma/                 # Prisma client instantiation & schema.prisma
│   ├── redis/                  # Redis client, balance cache, rate limiter scripts
│   ├── repositories/           # Data Access Layer (PostgreSQL query wrappers)
│   ├── services/               # Core domain logic (Transaction, Wallet, Fraud, Auth)
│   ├── types/                  # Shared TypeScript interfaces
│   ├── utils/                  # HTTP errors, logger, math helpers
│   ├── validators/             # Zod validation schemas
│   └── workers/                # Background worker implementations & runner index
├── components/                 # Reusable React 19 UI components
├── docker/                     # Postgres, Redis, Prometheus, Grafana configs
├── docs/                       # Architectural documentation & diagrams
├── hooks/                      # Custom React UI hooks
├── lib/                        # Shared utility modules
├── public/                     # Static public assets
├── tests/                      # Automated test harness
│   ├── concurrency/            # Parallel transaction race condition tests
│   ├── integration/            # API integration tests
│   ├── load/                   # k6 / autocannon load testing configs
│   └── unit/                   # Unit tests for domain services
├── Dockerfile                  # Production multi-stage Docker build
├── docker-compose.yml          # Container orchestration stack
├── package.json                # Project dependencies & scripts
├── render.yaml                 # Render cloud deployment specification
└── vercel.json                 # Vercel deployment specification
```

---

## 📜 License & Compliance

This software is designed for production digital wallet applications requiring strict financial auditability and ACID guarantee compliance.
```
