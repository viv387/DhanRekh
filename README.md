# 🏦 Money Ledger — High-Throughput Digital Wallet & Distributed Immutable Ledger System

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis 7](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-7.6-231F20?style=for-the-badge&logo=apachekafka)](https://kafka.apache.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

---

## 📌 Executive Overview

**Money Ledger** is a production-grade, fault-tolerant financial backend and digital wallet platform designed for high-concurrency peer-to-peer (P2P) transfers, multi-currency wallet management, and immutable audit logging. 

Engineered with fintech-grade ACID compliance, the application guarantees zero balance drift under high race conditions using **PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`)**, **Double-Entry Accounting**, **Redis Cache-Aside Invalidation & Rate Limiting**, and **Apache Kafka Event-Driven Worker Orchestration**.

---

## 🏗️ System Architecture & Technology Stack

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT / FRONTEND                                 |
|                     Next.js 15 (App Router) + React 19 + Tailwind                 |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                         BACKEND ENGINE (ROUTE HANDLERS)                           |
|       Authentication | Authorization | Rate Limiting | Validation (Zod)          |
+-----------------------------------------------------------------------------------+
       |                                   |                                  |
       v                                   v                                  v
+---------------+                 +-----------------+                +---------------+
|  PostgreSQL   |                 |      Redis      |                |  Apache Kafka |
|  Source of    |                 | Speed Layer &   |                | Event Stream  |
|  Truth (ACID) |                 | Rate Limiting   |                | & Outbox      |
+---------------+                 +-----------------+                +---------------+
                                                                             |
                                                                             v
                                                                     +---------------+
                                                                     | Async Workers |
                                                                     | Analytics,    |
                                                                     | Email, Audit, |
                                                                     | Scheduler     |
                                                                     +---------------+
```

### Core Architecture Components:
- **Web Application & API Core**: Next.js 15, React 19, TypeScript, Zod Schema Validation.
- **Relational Storage & Ledger**: PostgreSQL 16 managed via Prisma ORM with strict raw SQL pessimistic concurrency locks (`FOR UPDATE`).
- **In-Memory Speed & Security Layer**: Redis 7 Alpine implementing balance caching, atomic sliding-window rate limiting, and precalculated analytics storage.
- **Async Messaging & Event Streaming**: Apache Kafka (KafkaJS) coupled with the Transactional Outbox Pattern for dual-write consistency.
- **Distributed Resilience**: Circuit Breakers (Prometheus instrumented), Exponential Backoff with Jitter, Dead Letter Queues (DLQ), and Health Probes (`/api/health`, `/api/ready`, `/api/live`).

---

## ⚡ Redis In-Memory Speed & Rate-Limiting Engine

Redis serves as Money Ledger's low-latency execution layer. For detailed system design interview preparation, key schemas, failure mode analysis, and interview Q&As, refer to the official **[`REDIS_INTERVIEW_GUIDE.md`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/REDIS_INTERVIEW_GUIDE.md)**.

### Key Redis Implementations:
1. **Wallet Balance Caching (`balanceCache.get / set`)**:
   - **Key Format**: `wallet:balance:${walletId}`
   - **Strategy**: Cache-Aside read path with write-through invalidation post-DB transaction commit.
2. **Atomic Sliding-Window Rate Limiting (`enforceRateLimit`)**:
   - **Key Format**: `money-move:${action}:${userId}`
   - **Mechanism**: Atomic `INCR` + 60s window expiration (`EXPIRE`) enforcing limits on money transfers (5 req/min) and deposits/withdrawals (30 req/min).
3. **Precomputed Event-Driven Dashboard Analytics**:
   - **Key Format**: `analytics:dashboard:${userId}` (300s TTL).
   - **Workflow**: Background Kafka consumer (`analytics.worker.ts`) recalculates complex PostgreSQL aggregation metrics on transaction events and writes JSON payloads directly to Redis.
4. **Non-Blocking Fault Tolerance**:
   - 2-second connection timeout (`connectTimeoutMs: 2000`) and disabled auto-reconnect (`reconnectStrategy: false`). If Redis becomes unavailable, backend services automatically degrade gracefully by reading directly from PostgreSQL without API downtime.

---

## 📋 Complete Architectural Phases & Capabilities

### ✅ Phase 1: Concurrency Control & Double-Entry Accounting
- **ACID Financial Transactions**: Raw SQL pessimistic row locking (`SELECT ... FOR UPDATE`) with deterministic Wallet ID ordering (`ORDER BY id ASC`) to prevent deadlocks.
- **Double-Entry Ledger Accounting**: Every financial operation creates balanced `DEBIT` and `CREDIT` entries recording `balanceBefore` and `balanceAfter`.
- **Idempotency Protection**: Enforces `IdempotencyKey` tracking to guarantee exact-once execution and prevent duplicate charges on retry attempts.

### ✅ Phase 2: Asynchronous Workers & Real-Time Analytics
- **Multi-Worker Process Runner (`npm run workers`)**: Isolated consumer group loops handling background jobs (`notification-worker`, `analytics-worker`, `audit-worker`, `email-worker`, `outbox-relay`, `scheduler-worker`).
- **Kafka-Driven Analytics Pipeline**: Asynchronous worker updates Redis cache upon receiving transaction events.
- **Advanced Transaction Filtering & Search**: Multi-field querying by transaction type, status, amount bounds, date windows, with dynamic sorting and paginated responses.

### ✅ Phase 3: Enterprise Hardening, DevOps & Testing
- **Multi-Stage Production Containerization**: 3-stage lightweight Docker build running under a restricted non-root `nextjs` security context.
- **Full Docker Compose Stack**: Orchestrates 8 containers (`postgres`, `redis`, `kafka`, `zookeeper`, `app`, `workers`, `prometheus`, `grafana`).
- **Automated Verification**: Comprehensive test suite (`npm test`) validating unit logic, end-to-end API integration, race-condition concurrency stress, and load limits.

### ✅ Phase 4: Distributed Resilience & Fintech Integrations
- **Transactional Outbox & DLQ Engine**: Prevents partial dual-write failures between PostgreSQL and Kafka. Unprocessable events shift to `DeadLetterMessage` with manual replay endpoints (`POST /api/dlq/replay`).
- **Circuit Breakers & Observability**: Resilient exchange rate fallback engine with Prometheus circuit state reporting (`open`, `half-open`, `closed`) and OpenTelemetry `x-correlation-id` request tracing.
- **Rule-Based Fraud Detection**: Real-time risk scoring (0-100) and confidence metrics checking velocity, high-value transfers, and wallet drain indicators.

---

## 🗄️ Database Schema Summary (`schema.prisma`)

```prisma
enum WalletStatus { ACTIVE, SUSPENDED, CLOSED }
enum TransactionType { DEPOSIT, WITHDRAW, TRANSFER, CONVERSION }
enum TransactionStatus { PENDING, COMPLETED, FAILED, REVERSED }
enum LedgerEntryType { DEBIT, CREDIT }

User (id, username, email, phone, passwordHash, isEmailVerified, twoFactorEnabled, twoFactorSecret)
 ├── Wallet (id, userId, accountNumber, balance, currency, status)
 ├── RefreshToken (id, userId, refreshToken, expiresAt)
 ├── IdempotencyKey (id, userId, transactionId, idempotencyKey)
 ├── AuditLog (id, userId, action, ipAddress, userAgent)
 ├── Notification (id, userId, title, message, isRead)
 ├── CurrencyConversion (id, userId, walletId, fromCurrency, toCurrency, fromAmount, toAmount, rate)
 ├── ScheduledPayment (id, userId, senderWalletId, receiverAccountNumber, amount, frequency, nextRunAt)
 └── FraudAlert (id, userId, transactionId, riskScore, confidenceScore, reasons)

Transaction (id, senderWalletId, receiverWalletId, amount, transactionType, status, description)
 └── Ledger (id, transactionId, walletId, entryType, amount, balanceBefore, balanceAfter)

Outbox (id, aggregateType, aggregateId, eventType, payload, status, retryCount)
DeadLetterMessage (id, topic, consumerGroup, payload, errorReason, status, replayedAt)
```

---

## 🔌 API Endpoint Reference

| HTTP Method | API Path | Functional Purpose | Authentication |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Account creation & wallet initialization | Public |
| `POST` | `/api/auth/login` | Session login & JWT token issuance | Public |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile | Bearer / Cookie |
| `POST` | `/api/auth/refresh` | Rotate expired JWT access tokens | Cookie |
| `GET` | `/api/wallet` | Fetch user wallet & cached balance | Required |
| `POST` | `/api/wallet/convert` | Execute real-time multi-currency conversion | Required |
| `POST` | `/api/transaction/deposit` | Process deposit (Pessimistic lock + Outbox) | Required |
| `POST` | `/api/transaction/withdraw` | Process withdrawal (Balance verification + Lock) | Required |
| `POST` | `/api/transaction/transfer` | P2P Transfer (Dual row locks + Double Entry) | Required |
| `GET` | `/api/transactions` | Search & filter transactions with pagination | Required |
| `POST` | `/api/transactions/scheduled` | Schedule one-time or recurring transfers | Required |
| `GET` | `/api/ledger` | Retrieve double-entry ledger audit feed | Required |
| `GET` | `/api/analytics` | Fetch precalculated Redis analytics dashboard | Required |
| `GET` | `/api/notifications` | Fetch user notification drawer & unread counter | Required |
| `GET` | `/api/health` | Liveness health probe | Public |
| `GET` | `/api/ready` | Kubernetes readiness probe (PostgreSQL & Redis check) | Public |
| `GET` | `/api/live` | Deep system infrastructure probe (DB, Redis, Kafka) | Public |

---

## 💻 Quick Start & Deployment Guide

### Option 1: Local Development
```bash
# 1. Install dependencies & initialize database client
npm install
npx prisma generate
npx prisma db push

# 2. Start Next.js Development Server
npm run dev

# 3. Launch Background Kafka Workers & Outbox Relay
npm run workers

# 4. Execute Automated Test Suite
npm test
```

### Option 2: Docker Compose Orchestration
```bash
# Spin up all 8 microservices (Postgres, Redis, Kafka, Zookeeper, App, Workers, Prometheus, Grafana)
docker compose up --build
```

- **Web Dashboard**: `http://localhost:3000`
- **Prometheus Metrics**: `http://localhost:9090`
- **Grafana Monitoring**: `http://localhost:3001` *(Credentials: `admin` / `admin`)*

---

## 📚 Specialized Documentation Guides

- 📘 **[Redis Architecture & Interview Guide](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/REDIS_INTERVIEW_GUIDE.md)** — Complete deep dive into Redis caching, sliding-window rate limiting, and 15 system design interview Q&As.

---
*Official Production Documentation — Money Ledger Platform.* 🏛️
