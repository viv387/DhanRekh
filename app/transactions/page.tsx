"use client";

import { useEffect, useState } from "react";

type WalletData = {
  id: string;
  userId: string;
  accountNumber: string;
  balance: string;
  currency: string;
  status: string;
  createdAt: string;
};

type TransactionData = {
  id: string;
  senderWalletId: string | null;
  receiverWalletId: string | null;
  amount: string;
  transactionType: string;
  status: string;
  description: string | null;
  createdAt: string;
  ledgerEntries?: Array<{
    id: string;
    entryType: string;
    amount: string;
    balanceBefore: string;
    balanceAfter: string;
  }>;
};

type PaginationData = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TransactionsPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Money movement form states
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [receiverAccountNumber, setReceiverAccountNumber] = useState("");
  const [description, setDescription] = useState("");

  // Search & Filter states
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [page, setPage] = useState<number>(1);

  async function loadWallet() {
    try {
      const res = await fetch("/api/wallet", { credentials: "include" });
      if (res.ok) {
        const payload = (await res.json()) as { wallet: WalletData };
        setWallet(payload.wallet);
      }
    } catch {
      // ignore
    }
  }

  async function searchTransactions() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterType) query.set("type", filterType);
      if (filterStatus) query.set("status", filterStatus);
      if (minAmount) query.set("minAmount", minAmount);
      if (maxAmount) query.set("maxAmount", maxAmount);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortOrder) query.set("sortOrder", sortOrder);
      query.set("page", String(page));
      query.set("limit", "10");

      const response = await fetch(`/api/transactions?${query.toString()}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to load transactions");
      }

      const payload = (await response.json()) as { transactions: TransactionData[]; pagination?: PaginationData };
      setTransactions(payload.transactions ?? []);
      if (payload.pagination) {
        setPagination(payload.pagination);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    searchTransactions();
  }, [filterType, filterStatus, sortBy, sortOrder, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    searchTransactions();
  };

  async function executeTransaction(endpoint: string, bodyPayload: Record<string, unknown>, successMessage: string) {
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...bodyPayload,
          idempotencyKey: newIdempotencyKey(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Transaction failed");
      }

      setMessage(successMessage);
      setDepositAmount("");
      setWithdrawAmount("");
      setTransferAmount("");
      setReceiverAccountNumber("");
      setDescription("");
      await Promise.all([loadWallet(), searchTransactions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Transaction History & Search</p>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Money Movement & Ledger Search</h1>
          </div>
          <a href="/dashboard" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            Back to Dashboard
          </a>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
            {message}
          </div>
        )}

        {/* Action Forms Section */}
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Deposit Form */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Deposit Funds</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTransaction("/api/transaction/deposit", { amount: Number(depositAmount), description }, "Deposit completed successfully!");
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="text-xs text-slate-400">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="100.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Description</label>
                <input
                  type="text"
                  placeholder="Salary deposit"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                Deposit
              </button>
            </form>
          </div>

          {/* Withdraw Form */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Withdraw Funds</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTransaction("/api/transaction/withdraw", { amount: Number(withdrawAmount), description }, "Withdrawal completed successfully!");
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="text-xs text-slate-400">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="50.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Description</label>
                <input
                  type="text"
                  placeholder="ATM withdrawal"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-xl bg-purple-500 py-3 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:opacity-50"
              >
                Withdraw
              </button>
            </form>
          </div>

          {/* Transfer Form */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Transfer Funds</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTransaction(
                  "/api/transaction/transfer",
                  { amount: Number(transferAmount), receiverAccountNumber, description },
                  "Transfer sent successfully!"
                );
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="text-xs text-slate-400">Receiver Account #</label>
                <input
                  type="text"
                  required
                  placeholder="ACC-XXXXXX"
                  value={receiverAccountNumber}
                  onChange={(e) => setReceiverAccountNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="25.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                Transfer
              </button>
            </form>
          </div>
        </section>

        {/* Advanced Search & Filtering Section */}
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white">Search & Filter Transactions</h2>
          <form onSubmit={handleSearchSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <div>
              <label className="text-xs text-slate-400">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              >
                <option value="">All Types</option>
                <option value="DEPOSIT">DEPOSIT</option>
                <option value="WITHDRAW">WITHDRAW</option>
                <option value="TRANSFER">TRANSFER</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Min Amount</label>
              <input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Max Amount</label>
              <input
                type="number"
                placeholder="10000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              >
                <option value="createdAt">Date Created</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Sort Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              >
                <option value="desc">Newest / Highest</option>
                <option value="asc">Oldest / Lowest</option>
              </select>
            </div>
          </form>
        </section>

        {/* Transactions Table Section */}
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Results ({pagination.total})</h2>
            <p className="text-sm text-slate-400">Page {pagination.page} of {pagination.totalPages}</p>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <p className="p-6 text-sm text-slate-400">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                No matching transactions found.
              </p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                          {tx.transactionType}
                        </span>
                        <span className="text-xs text-slate-400">{tx.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">{tx.description ?? "No description"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400">${tx.amount}</p>
                      <p className="text-xs text-slate-400">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">Page {page} of {pagination.totalPages}</span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
