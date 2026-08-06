# 🚀 Redis Architecture & Interview Guide — Money Ledger 💰

> **Comprehensive Technical Documentation & Interview Preparation Guide** for the Redis integration in the **Money Ledger** project.

---

## 📌 Executive Summary

In **Money Ledger**, Redis (v7.0 Alpine) acts as an **in-memory speed layer** and **traffic regulator** alongside PostgreSQL 16 (the immutable database of record). While PostgreSQL provides ACID guarantees and handles row-level locking (`SELECT ... FOR UPDATE`), Redis handles high-frequency read operations and security guardrails to ensure sub-millisecond API response times and protect backend services from overload.

### Key Metrics & Highlights:
- **Redis Version**: `redis:7-alpine`
- **Node Client**: Official Node Redis v4+ (`redis@^6.1.0`)
- **Primary Use Cases**: Wallet Balance Caching, Atomic Rate Limiting, Precomputed Dashboard Analytics, Readiness & Health Probes.
- **Resilience**: Non-blocking connection timeout (2s fast-fail) + automatic graceful fallback to PostgreSQL on cache miss or Redis crash.
- **Eviction Policy**: `allkeys-lru` capped at `256MB`.
- **Persistence Strategy**: Dual Hybrid (AOF `appendonly yes` + RDB periodic snapshots).

---

## 🏗️ Architectural Topology & Use Cases

```
                    +-------------------------------------+
                    |       Incoming API Requests        |
                    +-------------------------------------+
                                       |
                                       v
                     +----------------------------------+
                     |    Next.js Route Handlers / API  |
                     +----------------------------------+
                                  /        \
                                 /          \
  [1. Rate Limiting: INCR]      /            \  [2. Balance / Analytics Cache]
                               v              v
                    +------------------------------------+
                    |       Redis (In-Memory Data)       |
                    |   - wallet:balance:{id}            |
                    |   - rate-limit:{action}:{userId}   |
                    |   - analytics:dashboard:{userId}   |
                    +------------------------------------+
                                       | (Fallback / Cache Miss)
                                       v
                    +------------------------------------+
                    |      PostgreSQL 16 (Source of      |
                    |      Truth & Double Entry)         |
                    +------------------------------------+
```

---

## 🔑 Key Schema & Naming Conventions

| Key Pattern | Data Structure | TTL | Description | Primary File |
| :--- | :--- | :--- | :--- | :--- |
| `wallet:balance:${walletId}` | String | None (Invalidated on write) | Caches normalized wallet balance string for sub-ms balance reads. | [`balance.cache.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/redis/balance.cache.ts) |
| `rate-limit:${action}:${userId}` | String (Integer counter) | `60s` (Sliding window) | Tracks API invocation count for generic user actions. | [`rateLimiter.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/middleware/rateLimiter.ts) |
| `money-move:${action}:${userId}` | String (Integer counter) | `60s` (Sliding window) | Strict rate limiting counter for financial actions (`deposit`, `withdraw`, `transfer`). | [`rateLimiter.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/middleware/rateLimiter.ts) |
| `analytics:dashboard:${userId}` | String (JSON Blob) | `300s` (5 minutes) | Caches precalculated user dashboard metrics (balances, totals, counts, recent items). | [`analytics.service.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/services/analytics.service.ts) |
| `health:check` | String | Temporary | Written by `/api/ready` to assert Redis read/write readiness. | [`route.ts (ready)`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/api/ready/route.ts) |
| `health:ping` | String | Temporary | Read by `/api/live` to check deep system health. | [`route.ts (live)`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/api/live/route.ts) |

---

## 🛠️ Deep Dive: Core Redis Implementations

### 1. Connection Management & Resilience Strategy
- **File**: [`backend/redis/redis.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/redis/redis.ts)
- **Pattern**: Singleton client + Lazy asynchronous initialization with connection deduplication (`connectPromise`).
- **Failure Tolerance**:
  - `connectTimeoutMs: 2000` (Fast fail within 2 seconds).
  - `reconnectStrategy: false` (Disables automatic infinite retries to prevent blocking API requests during Redis outage).
  - **Graceful Fallback**: If Redis is unreachable, `getRedisClient()` returns `null`. All upstream service wrappers check for `null` and fall back to querying PostgreSQL directly without raising unhandled errors to the user.

```typescript
// Sample snippet from redis.ts showing fast-fail configuration
redisClient = createClient({
  url: authEnv.redisUrl,
  socket: {
    connectTimeoutMs: 2000,   // Fail fast: 2s max timeout
    reconnectStrategy: false,  // Immediate fallback to PostgreSQL
  },
});
```

---

### 2. Cache-Aside Balance Management
- **Files**: [`backend/redis/balance.cache.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/redis/balance.cache.ts), [`backend/services/wallet.service.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/services/wallet.service.ts), [`backend/services/transaction.service.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/services/transaction.service.ts)
- **Workflow**:
  1. **Read (`getMyWallet`)**: Queries Redis via `balanceCache.get(walletId)`.
     - *Cache Hit*: Returns cached string instantly.
     - *Cache Miss*: Reads wallet balance from PostgreSQL DB, executes `balanceCache.set(walletId, balance)`, and returns result.
  2. **Write (`deposit`, `withdraw`, `transfer`)**: Executes financial mutation inside PostgreSQL `$transaction` block using `SELECT ... FOR UPDATE` row-level locks. Immediately after successful DB commit, `balanceCache.set(walletId, newBalance)` updates Redis.
- **Why String instead of Float?**: Financial balances are stored as strings to preserve decimal precision and prevent floating-point rounding errors (e.g. `10.00` vs `10.0000000001`).

---

### 3. Atomic Sliding-Window Rate Limiting
- **File**: [`backend/middleware/rateLimiter.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/middleware/rateLimiter.ts)
- **Endpoints Protected**: `POST /api/transaction/deposit`, `POST /api/transaction/withdraw`, `POST /api/transaction/transfer`.
- **Workflow**:
  1. Computes rate limit key: `money-move:${action}:${userId}`.
  2. Invokes Redis atomic `INCR` via `cacheService.incrementValue(key)`.
  3. If returned count is `1` (first request in window), sets window expiry via `cacheService.setExpiry(key, 60)`.
  4. If returned count > limit (e.g., > 5 transfers/min or > 30 deposits/min), throws `HttpError(429, "Too many requests. Please try again later.")`.
- **Atomic Concurrency Guarantee**: Redis single-threaded `INCR` guarantees thread safety against race conditions under concurrent burst traffic.

---

### 4. Event-Driven Precomputed Analytics
- **Files**: [`backend/services/analytics.service.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/services/analytics.service.ts), [`backend/workers/analytics.worker.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/workers/analytics.worker.ts)
- **Workflow**:
  1. User calls `GET /api/analytics`. API checks Redis key `analytics:dashboard:${userId}`.
  2. If present, returns precalculated JSON summary immediately.
  3. When a transaction completes, Kafka emits `deposit.completed`, `withdraw.completed`, or `transfer.completed`.
  4. `analytics.worker.ts` consumes the Kafka event and calls `analyticsService.refreshDashboardSummary(userId)` asynchronously.
  5. The service recalculates aggregate statistics from PostgreSQL and writes the fresh JSON blob to Redis with a `300s` (5 min) TTL.

---

### 5. Infrastructure & Configuration
- **File**: [`docker/redis/redis.conf`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/docker/redis/redis.conf) & [`docker-compose.yml`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/docker-compose.yml)
- **Configuration Highlights**:
  ```ini
  maxmemory 256mb
  maxmemory-policy allkeys-lru
  appendonly yes
  save 900 1
  save 300 10
  save 60 10000
  ```
- **Eviction Policy (`allkeys-lru`)**: When memory hits `256MB`, Redis automatically evicts the Least Recently Used keys across all keys, protecting the instance from out-of-memory (OOM) crashes.
- **Dual Persistence**:
  - **AOF (`appendonly yes`)**: Logs every write command for minimal data loss on unexpected container restarts.
  - **RDB Snapshots**: Periodic point-in-time snapshots to disk.

---

## 🎯 Top 15 Interview Questions & Answers

### Q1: Why did you use Redis in a financial digital wallet application when PostgreSQL is already present?
**Answer**:  
PostgreSQL is our single source of truth and enforces ACID compliance and double-entry accounting. However, database operations—especially with row-level locks—are CPU and disk IO intensive. Redis is an in-memory data store providing sub-millisecond response times. We use Redis for non-critical high-frequency operations:
1. **Balance Caching**: Read-heavy dashboard queries hit Redis first instead of hitting PostgreSQL.
2. **Rate Limiting**: Atomic request counting in Redis protects PostgreSQL from being spammed.
3. **Precomputed Analytics**: Heavy SQL `GROUP BY` aggregates are calculated asynchronously by background workers and cached in Redis.

---

### Q2: What strategy do you use for cache invalidation when a user transfers money?
**Answer**:  
We use a **Cache-Aside Write-Through Invalidation** strategy. 
During a transfer:
1. PostgreSQL executes an ACID transaction with `SELECT ... FOR UPDATE` row locks on both sender and receiver wallets.
2. Ledger `DEBIT` and `CREDIT` entries are created.
3. Once the PostgreSQL transaction successfully commits, `transactionService` calls `balanceCache.set(senderWalletId, newBalance)` and `balanceCache.set(receiverWalletId, newBalance)` to update Redis immediately.
4. Kafka publishes a `transfer.completed` event, which triggers `analytics.worker.ts` to refresh the precomputed dashboard JSON in Redis.

---

### Q3: What happens to Money Ledger if Redis crashes or becomes network partitioned?
**Answer**:  
The system degrades gracefully with **zero data loss and zero downtime**:
1. In [`redis.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/redis/redis.ts), we configure a 2-second connection timeout (`connectTimeoutMs: 2000`) and disable auto-reconnect (`reconnectStrategy: false`).
2. If Redis fails, `getRedisClient()` catches the error and returns `null`.
3. Wrapper services like `balanceCache` and `analyticsService` detect `null` and fall back directly to PostgreSQL queries.
4. Rate limiters pass traffic through safely when Redis is `null`.
5. The `/api/live` health endpoint marks system status as `degraded` so DevOps monitors are alerted, but users can still process financial transactions seamlessly.

---

### Q4: How do you handle race conditions during rate limiting?
**Answer**:  
We rely on Redis's single-threaded event loop and atomic commands. In [`rateLimiter.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/middleware/rateLimiter.ts), we use `client.incr(key)`. The `INCR` operation is atomic—even if 100 concurrent requests arrive at the exact same millisecond, Redis increments the integer counter sequentially without race conditions. If the returned value is `1`, we set key expiry via `client.expire(key, windowSeconds)`.

---

### Q5: Why is `wallet:balance` stored as a string instead of a number in Redis?
**Answer**:  
In JavaScript, standard numbers are 64-bit IEEE 754 floating-point values, which suffer from precision loss (e.g. `0.1 + 0.2 = 0.30000000000000004`). In financial systems, precision loss is unacceptable. PostgreSQL stores balances using `Decimal(12, 2)`. When reading/writing to Redis, we preserve exact monetary amounts as formatted fixed-point string representations (e.g., `"1250.50"`).

---

### Q6: What is the eviction policy configured in Redis and why?
**Answer**:  
We configured `maxmemory-policy allkeys-lru` with `maxmemory 256mb` in [`redis.conf`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/docker/redis/redis.conf).
- **Why LRU?**: Least Recently Used eviction automatically drops keys that haven't been accessed recently when memory hits 256MB.
- **Why `allkeys` instead of `volatile`?**: Some of our keys (like balance cache) don't have explicit TTLs (they are evicted manually on write). `allkeys-lru` ensures that even keys without TTL can be safely evicted if memory is full, preventing Redis container OOM crashes.

---

### Q7: How does background analytics caching work with Kafka and Redis?
**Answer**:  
Calculating summary stats (total deposited, total withdrawn, transfer counts) requires complex PostgreSQL `groupBy` and `sum` aggregation queries across large transaction tables.
1. When a transaction completes, Kafka emits an event.
2. `analytics.worker.ts` (a dedicated consumer process running in background) receives the event.
3. The worker runs `analyticsService.refreshDashboardSummary(userId)` in the background.
4. The calculated result is saved in Redis as a JSON payload under `analytics:dashboard:${userId}` with a 5-minute (300s) TTL.
5. When the user loads `/dashboard`, `GET /api/analytics` fetches the cached JSON in ~1ms without touching PostgreSQL.

---

### Q8: How do you prevent Cache Stampede (Thundering Herd Problem)?
**Answer**:  
1. **Background Async Invalidation**: Dashboard analytics are proactively warmed up by Kafka background workers (`analytics.worker.ts`) immediately after transactions occur, rather than waiting for user HTTP requests.
2. **TTL Layering**: Analytics keys have a 5-minute TTL (`300s`), while balance keys have no TTL and are invalidated on write.
3. **Database Fallback Optimization**: In [`analytics.service.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/services/analytics.service.ts), SQL fallback queries use indexed DB-level `LIMIT 5` and `LIMIT 10` clauses to keep cache-miss DB execution time under 15ms.

---

### Q9: What happens if a user's cached balance in Redis gets out of sync with PostgreSQL?
**Answer**:  
PostgreSQL is always the authoritative source of truth.
1. Redis balance cache is **never** used to authorize or validate financial transfers.
2. Money transfers re-verify the real-time balance inside PostgreSQL using `SELECT ... FOR UPDATE` locks.
3. If Redis contains a stale balance, a user's dashboard might display the old balance temporarily, but any transfer attempt will check PostgreSQL and fail safely if funds are insufficient.
4. On every committed transaction, `balanceCache.set()` explicitly overwrites the Redis value with the fresh PostgreSQL balance.

---

### Q10: How do health check probes monitor Redis?
**Answer**:  
We implement two Kubernetes/Docker health probes in Next.js route handlers:
- **Readiness Probe (`GET /api/ready`)**: Issues a write test `cacheService.setValue("health:check", "1")`. If Redis fails to respond, returns `HTTP 503 Service Unavailable`, taking the instance out of load balancer routing.
- **Liveness/Deep Health Probe (`GET /api/live`)**: Issues a read test `cacheService.getValue("health:ping")`. Reports service statuses (`database`, `cache`, `messaging`) in a JSON body.

---

### Q11: Why enable both AOF and RDB persistence in `redis.conf`?
**Answer**:  
In [`redis.conf`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/docker/redis/redis.conf):
- **AOF (`appendonly yes`)**: Appends every write operation to disk log. Provides near-zero data loss in case of power loss or sudden container crashes.
- **RDB (`save 900 1`, etc.)**: Takes snapshot dumps at periodic intervals. RDB snapshots allow fast container startup and recovery on service restarts.
Combining both gives us **high durability (AOF)** and **fast reboot times (RDB)**.

---

### Q12: What is the singleton pattern used in `redis.ts` and why is it important?
**Answer**:  
In Next.js serverless/edge/route-handler environments, code can be re-evaluated frequently. Creating a new Redis client on every API call leads to connection exhaustion (socket leaks).
In [`redis.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/redis/redis.ts), we maintain a global `redisClient` variable and a single `connectPromise`. All API routes reuse the existing open socket connection.

---

### Q13: How would you test Redis fault-tolerance during an interview presentation?
**Answer**:  
1. **Unit/Integration Tests**: Run `npm test` which executes test suites where Redis connection errors are simulated or mocked.
2. **Container Stopping**: Run `docker stop money_ledger_redis` while executing transfer commands. Verify via logs that APIs continue to succeed by falling back to PostgreSQL, and `/api/live` flags Redis as degraded.

---

### Q14: What Redis data types are used and why not use Hashes or Sorted Sets?
**Answer**:  
Currently, we use:
- **Strings (Key-Value)**: For balance caching, analytics JSON blobs, and health check strings.
- **Strings as Integers**: For `INCR`-based rate limiting counters.

*Future Scalability*: For transaction leaderboard or time-series search history, Redis **Sorted Sets (`ZADD`/`ZRANGEBYSCORE`)** could be introduced to store recent transaction IDs indexed by timestamp for even faster pagination.

---

### Q15: How would you scale Redis if Money Ledger expanded to millions of active users?
**Answer**:  
1. **Redis Sentinel / Primary-Replica Replication**: Deploy 1 Primary node for writes and multiple Read Replicas for balance & analytics lookups.
2. **Redis Cluster (Sharding)**: Partition key slots across multiple Redis nodes using hash tags (e.g. `{user:123}:balance` and `{user:123}:analytics` to ensure keys for the same user land on the same shard).
3. **Client-Side Caching**: Leverage Redis v6+ Client-Side Caching (Tracking mode) to cache ultra-hot balances in Next.js memory with invalidation messages from Redis.

---

## 📂 Summary of Redis Related Files in Codebase

- 📄 [`backend/redis/redis.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/redis/redis.ts) — Connection manager, fast-fail & singleton logic.
- 📄 [`backend/redis/cache.service.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/redis/cache.service.ts) — Abstract Redis helper methods (`getValue`, `setValue`, `deleteKey`, `incrementValue`, `setExpiry`).
- 📄 [`backend/redis/balance.cache.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/redis/balance.cache.ts) — Wallet balance cache reader/writer.
- 📄 [`backend/middleware/rateLimiter.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/middleware/rateLimiter.ts) — Rate limiting engine.
- 📄 [`backend/services/analytics.service.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/services/analytics.service.ts) — Dashboard analytics caching.
- 📄 [`backend/workers/analytics.worker.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/backend/workers/analytics.worker.ts) — Event-driven Kafka analytics worker refreshing Redis.
- 📄 [`docker/redis/redis.conf`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/docker/redis/redis.conf) — Production Redis configuration.
- 📄 [`docker-compose.yml`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/docker-compose.yml) — Container setup & service orchestration.
- 📄 [`app/api/ready/route.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/api/ready/route.ts) & [`app/api/live/route.ts`](file:///c:/Users/vivek/OneDrive/Desktop/MONEY_LEDGER/my-app/app/api/live/route.ts) — Infrastructure health probes.

---
*Created for Money Ledger Interview Preparation.* 🎓
