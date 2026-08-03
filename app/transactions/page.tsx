"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { useToast } from "@/components/ui/Toast";

function IconArrowDown({ className }: { className?: string; size?: number }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
}
function IconArrowUp({ className }: { className?: string; size?: number }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
}
function IconArrowRight({ className }: { className?: string; size?: number }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
}
function IconSearch({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function IconFileText({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function IconCalendar({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function IconFilter({ className }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
}

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
  const router = useRouter();
  const { toast } = useToast();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Money movement form states - with independent descriptions
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDescription, setDepositDescription] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDescription, setWithdrawDescription] = useState("");

  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const [receiverAccountNumber, setReceiverAccountNumber] = useState("");

  // Search & Filter states
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [page, setPage] = useState<number>(1);

  const currencySymbol = wallet?.currency ?? "USD";

  async function loadWallet() {
    try {
      const res = await fetch("/api/wallet", { credentials: "include" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
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
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load transactions");
      }

      const payload = (await response.json()) as { transactions: TransactionData[]; pagination?: PaginationData };
      setTransactions(payload.transactions ?? []);
      if (payload.pagination) {
        setPagination(payload.pagination);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load transactions",

      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (active) {
      loadWallet();
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (active) {
      searchTransactions();
    }
    return () => {
      active = false;
    };
  }, [filterType, filterStatus, sortBy, sortOrder, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    searchTransactions();
  };

  async function executeTransaction(endpoint: string, bodyPayload: Record<string, unknown>, successMessage: string) {
    setActionLoading(true);
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

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Transaction failed");
      }

      toast({
        title: "Success",
        description: successMessage,
      });

      if (endpoint.includes("deposit")) {
        setDepositAmount("");
        setDepositDescription("");
      } else if (endpoint.includes("withdraw")) {
        setWithdrawAmount("");
        setWithdrawDescription("");
      } else if (endpoint.includes("transfer")) {
        setTransferAmount("");
        setTransferDescription("");
        setReceiverAccountNumber("");
      }

      await Promise.all([loadWallet(), searchTransactions()]);
    } catch (err) {
      toast({
        title: "Transaction Failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",

      });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10 animate-fade-in">
        {/* Header Section */}
        <header className="animate-slide-in-left">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Transactions
            </h1>
            <p className="text-slate-400">
              Manage your money movement and explore your ledger history
            </p>
          </div>
        </header>

        {/* Action Forms Section */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Deposit Form */}
          <div className="glass-card p-6 animate-fade-in-up delay-100 flex flex-col group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <IconArrowDown size={80} className="text-cyan-400" />
            </div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                <IconArrowDown className="text-cyan-400 w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Deposit</h3>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTransaction("/api/transaction/deposit", { amount: Number(depositAmount), description: depositDescription }, "Deposit completed successfully!");
              }}
              className="mt-auto space-y-4 relative z-10"
            >
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 sm:text-sm">{currencySymbol}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="100.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="input-field pl-12"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Description</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconFileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Salary deposit"
                    value={depositDescription}
                    onChange={(e) => setDepositDescription(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn-primary w-full mt-2"
              >
                Deposit Funds
              </button>
            </form>
          </div>

          {/* Withdraw Form */}
          <div className="glass-card p-6 animate-fade-in-up delay-200 flex flex-col group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <IconArrowUp size={80} className="text-purple-400" />
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <IconArrowUp className="text-purple-400 w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Withdraw</h3>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTransaction("/api/transaction/withdraw", { amount: Number(withdrawAmount), description: withdrawDescription }, "Withdrawal completed successfully!");
              }}
              className="mt-auto space-y-4 relative z-10"
            >
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 sm:text-sm">{currencySymbol}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="50.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-field pl-12 focus:border-purple-500/50 focus:ring-purple-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Description</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconFileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="ATM withdrawal"
                    value={withdrawDescription}
                    onChange={(e) => setWithdrawDescription(e.target.value)}
                    className="input-field pl-10 focus:border-purple-500/50 focus:ring-purple-500/20"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn-purple w-full mt-2"
              >
                Withdraw Funds
              </button>
            </form>
          </div>

          {/* Transfer Form */}
          <div className="glass-card p-6 animate-fade-in-up delay-300 flex flex-col group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <IconArrowRight size={80} className="text-emerald-400" />
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <IconArrowRight className="text-emerald-400 w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Transfer</h3>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeTransaction(
                  "/api/transaction/transfer",
                  { amount: Number(transferAmount), receiverAccountNumber, description: transferDescription },
                  "Transfer sent successfully!"
                );
              }}
              className="mt-auto space-y-4 relative z-10"
            >
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Receiver Account #</label>
                <input
                  type="text"
                  required
                  placeholder="ACC-XXXXXX"
                  value={receiverAccountNumber}
                  onChange={(e) => setReceiverAccountNumber(e.target.value)}
                  className="input-field focus:border-emerald-500/50 focus:ring-emerald-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Amount</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 sm:text-sm">{currencySymbol}</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="25.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="input-field pl-8 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Notes</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <IconFileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={transferDescription}
                      onChange={(e) => setTransferDescription(e.target.value)}
                      className="input-field pl-8 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn-emerald w-full mt-2"
              >
                Transfer Funds
              </button>
            </form>
          </div>
        </section>

        {/* Advanced Search & Filtering Section */}
        <section className="glass-card-static p-6 animate-fade-in-up delay-400">
          <div className="flex items-center gap-3 mb-6">
            <IconFilter className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Search & Filters</h2>
          </div>
          <form onSubmit={handleSearchSubmit} className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Types</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAW">Withdraw</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Min Amount</label>
              <input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Max Amount</label>
              <input
                type="number"
                placeholder="10000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field text-sm"
              >
                <option value="createdAt">Date Created</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input-field text-sm"
              >
                <option value="desc">Desc (New/High)</option>
                <option value="asc">Asc (Old/Low)</option>
              </select>
            </div>
          </form>
        </section>

        {/* Transactions Table Section */}
        <section className="glass-card-static p-6 animate-fade-in-up delay-500">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <IconCalendar className="w-5 h-5 text-purple-400" />
              Ledger History
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 font-medium">
                Total: {pagination.total} records
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row justify-between p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                  <div className="space-y-3 w-1/3">
                    <div className="skeleton h-5 w-24 rounded-full" />
                    <div className="skeleton h-4 w-32 rounded-md" />
                  </div>
                  <div className="space-y-3 w-1/4 mt-4 sm:mt-0 flex flex-col sm:items-end">
                    <div className="skeleton h-6 w-20 rounded-md" />
                    <div className="skeleton h-4 w-24 rounded-md" />
                  </div>
                </div>
              ))
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                <IconSearch className="w-12 h-12 text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Transactions Found</h3>
                <p className="text-slate-400 text-sm max-w-sm">
                  We couldn't find any transactions matching your current search criteria. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((tx) => {
                  let badgeClass = "bg-slate-500/10 text-slate-300 border-slate-500/20";
                  let amountColor = "text-slate-200";
                  let amountPrefix = "";

                  if (tx.transactionType === "DEPOSIT") {
                    badgeClass = "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
                    amountColor = "text-cyan-400";
                    amountPrefix = "+";
                  } else if (tx.transactionType === "WITHDRAW") {
                    badgeClass = "bg-purple-500/10 text-purple-300 border-purple-500/20";
                    amountColor = "text-purple-400";
                    amountPrefix = "-";
                  } else if (tx.transactionType === "TRANSFER") {
                    badgeClass = "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
                    amountColor = "text-emerald-400";
                    amountPrefix = tx.senderWalletId === wallet?.id ? "-" : "+";
                  }

                  let statusDotClass = "bg-slate-400";
                  if (tx.status === "COMPLETED") statusDotClass = "bg-emerald-400";
                  if (tx.status === "PENDING") statusDotClass = "bg-amber-400";
                  if (tx.status === "FAILED") statusDotClass = "bg-rose-400";

                  return (
                    <div key={tx.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/[0.02] transition-colors rounded-xl -mx-4">
                      <div className="flex items-center gap-4">
                        <div className={`hidden sm:flex h-12 w-12 rounded-full items-center justify-center border ${badgeClass.replace('bg-', 'bg-opacity-20 border-')}`}>
                          {tx.transactionType === "DEPOSIT" && <IconArrowDown className="w-5 h-5 text-cyan-400" />}
                          {tx.transactionType === "WITHDRAW" && <IconArrowUp className="w-5 h-5 text-purple-400" />}
                          {tx.transactionType === "TRANSFER" && <IconArrowRight className="w-5 h-5 text-emerald-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${badgeClass}`}>
                              {tx.transactionType}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <div className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                              {tx.status}
                            </div>
                          </div>
                          <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                            {tx.description || "No description provided"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-0 flex flex-col sm:items-end sm:text-right pl-16 sm:pl-0">
                        <div className={`text-lg font-bold tracking-tight ${amountColor}`}>
                          {amountPrefix}{currencySymbol}{tx.amount}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-primary !py-2 !px-4 !bg-white/5 !text-white hover:!bg-white/10 !border-white/10 disabled:opacity-30 disabled:hover:!bg-white/5"
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Page</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-medium text-white border border-white/5">
                  {page}
                </span>
                <span className="text-sm text-slate-400">of {pagination.totalPages}</span>
              </div>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-primary !py-2 !px-4 !bg-white/5 !text-white hover:!bg-white/10 !border-white/10 disabled:opacity-30 disabled:hover:!bg-white/5"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
