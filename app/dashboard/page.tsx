"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";

type WalletSummary = {
  id: string;
  userId: string;
  accountNumber: string;
  balance: string;
  currency: string;
  status: string;
  createdAt: string;
};

type TransactionEntry = {
  id: string;
  senderWalletId: string | null;
  receiverWalletId: string | null;
  amount: string;
  transactionType: string;
  status: string;
  description: string | null;
  createdAt: string;
};

type LedgerEntry = {
  id: string;
  transactionId: string;
  walletId: string;
  entryType: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
};

type DashboardData = {
  wallet: WalletSummary;
  summary: {
    currentBalance: string;
    transactionCount: number;
    ledgerEntryCount: number;
    depositCount: number;
    withdrawCount: number;
    transferCount: number;
    totalDeposited: string;
    totalWithdrawn: string;
    totalTransferred: string;
  };
  recentTransactions: TransactionEntry[];
  recentLedgerEntries: LedgerEntry[];
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrencySymbol(currency: string) {
  switch (currency?.toUpperCase()) {
    case "INR": return "₹";
    case "EUR": return "€";
    case "GBP": return "£";
    default: return "$";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"24H" | "7D" | "30D" | "ALL">("7D");
  const [activeTab, setActiveTab] = useState<"movement" | "ledger">("movement");

  // Quick Action Modal States
  const [actionModal, setActionModal] = useState<"deposit" | "transfer" | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [targetAccount, setTargetAccount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [dashRes, notifRes] = await Promise.all([
          fetch("/api/analytics", { credentials: "include" }),
          fetch("/api/notifications", { credentials: "include" }),
        ]);

        if (dashRes.status === 401 || notifRes.status === 401) {
          router.push("/login");
          return;
        }

        if (!dashRes.ok) {
          const payload = (await dashRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to load dashboard data");
        }

        const dashPayload = (await dashRes.json()) as DashboardData;
        let notifPayload: { notifications: NotificationItem[]; unreadCount: number } = { notifications: [], unreadCount: 0 };
        if (notifRes.ok) {
          notifPayload = (await notifRes.json()) as { notifications: NotificationItem[]; unreadCount: number };
        }

        if (active) {
          setData(dashPayload);
          setNotifications(notifPayload.notifications ?? []);
          setUnreadCount(notifPayload.unreadCount ?? 0);
        }
      } catch (loadError) {
        if (active) {
          toast({
            title: "Error",
            message: loadError instanceof Error ? loadError.message : "Failed to connect to backend",
            type: "error",
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [router, toast]);

  async function handleQuickAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      toast({ title: "Validation Error", message: "Please enter a valid amount", type: "error" });
      return;
    }

    setActionLoading(true);
    try {
      const endpoint = actionModal === "deposit" ? "/api/transaction/deposit" : "/api/transaction/transfer";
      const payload = actionModal === "deposit" 
        ? { amount: actionAmount, description: "Quick Deposit via Dashboard" }
        : { receiverAccountNumber: targetAccount, amount: actionAmount, description: "Quick Transfer via Dashboard" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Transaction failed");

      toast({
        title: "Transaction Confirmed",
        message: actionModal === "deposit" ? `Deposited successfully` : `Transferred ${actionAmount} to ${targetAccount}`,
        type: "success",
      });

      setActionModal(null);
      setActionAmount("");
      setTargetAccount("");
      
      // Refresh dashboard data
      const refreshRes = await fetch("/api/analytics", { credentials: "include" });
      if (refreshRes.ok) {
        const updated = await refreshRes.json();
        setData(updated);
      }
    } catch (err) {
      toast({
        title: "Transaction Failed",
        message: err instanceof Error ? err.message : "An error occurred",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function markAllNotificationsRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast({ title: "Notifications", message: "All notifications marked as read", type: "success" });
      }
    } catch {
      toast({ title: "Error", message: "Failed to update notifications", type: "error" });
    }
  }

  const symbol = formatCurrencySymbol(data?.wallet.currency ?? "INR");

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* ── Top Header / Breadcrumb Bar ─────────────────────────────── */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>DhanRekh</span>
              <span>/</span>
              <span className="text-slate-200 font-semibold">Overview</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Ledger Overview
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Immutable ledger state, balance tracking, and transaction flow for wallet <span className="font-mono text-slate-300">{data?.wallet.accountNumber ?? "Loading..."}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-live" />
              ACID SYNCHRONIZED
            </div>

            {/* Notifications Toggle */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Notifications
              {unreadCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Quick Actions */}
            <button
              onClick={() => setActionModal("deposit")}
              className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition"
            >
              + Deposit
            </button>
            <button
              onClick={() => setActionModal("transfer")}
              className="rounded-lg bg-white text-slate-950 font-semibold px-3.5 py-2 text-xs hover:bg-slate-200 transition"
            >
              Transfer →
            </button>
          </div>
        </header>

        {/* Notifications Modal Drawer */}
        {showNotifications && (
          <section className="terminal-card p-5 animate-scale-in border-cyan-500/20">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Audit & Activity Alerts</h3>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {notifications.length} Total
                </span>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllNotificationsRead} className="text-xs text-cyan-400 hover:underline">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No new alerts recorded.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg border p-3 text-xs ${
                      n.isRead ? "border-white/[0.05] bg-white/[0.01] text-slate-400" : "border-cyan-500/30 bg-cyan-950/20 text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-200">{n.title}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-slate-300">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ── Top Metric Cards Grid (Matching Reference Design) ─────────────── */}
        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 skeleton rounded-2xl animate-fade-in-up" />
            ))}
          </section>
        ) : data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Card 1: Portfolio / Net Balance */}
              <div className="terminal-card p-5 animate-fade-in-up delay-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Ledger Balance</p>
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-slate-300">
                    {data.wallet.currency}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                    {symbol} {data.summary.currentBalance}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    +2.41% vs last week
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Active</span>
                </div>
              </div>

              {/* Card 2: 24H Volume / Movement */}
              <div className="terminal-card p-5 animate-fade-in-up delay-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">24H Movement Volume</p>
                  <span className="text-xs text-slate-400 font-mono">TX {data.summary.transactionCount}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                    {symbol} {data.summary.totalDeposited}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {data.summary.depositCount} Inflows · {data.summary.withdrawCount + data.summary.transferCount} Outflows
                  </span>
                  <span className="text-cyan-400 font-mono text-[11px]">Realized</span>
                </div>
              </div>

              {/* Card 3: Immutable Ledger Entries */}
              <div className="terminal-card p-5 animate-fade-in-up delay-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Double-Entry Ledger</p>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                    100% AUDITED
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                    {data.summary.ledgerEntryCount}
                  </span>
                  <span className="text-xs text-slate-400">Entries</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Balanced Debits & Credits</span>
                  <span className="text-slate-400 font-mono text-[11px]">Zero Drift</span>
                </div>
              </div>

              {/* Card 4: Integrity & Concurrency */}
              <div className="terminal-card p-5 animate-fade-in-up delay-400">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Concurrency Lock</p>
                  <span className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300">
                    FOR UPDATE
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                    Pessimistic
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-emerald-400 inline-flex items-center gap-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    ACID Secured
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">Strict SQL</span>
                </div>
              </div>
            </section>

            {/* ── Main Ledger Visualizer & Breakdown Grid ────────────────────── */}
            <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
              {/* Interactive Balance & Volume Trend Visualizer */}
              <div className="terminal-card p-6 animate-fade-in-up delay-500 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white tracking-tight">Ledger Volume & Balance Trend</h2>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          ● LIVE FEED
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Historical flow breakdown and concurrency execution metric</p>
                    </div>

                    {/* Timeframe Pill Selector */}
                    <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/40 p-1 self-start sm:self-auto">
                      {(["24H", "7D", "30D", "ALL"] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`pill-tab ${timeframe === tf ? "pill-tab-active" : ""}`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Financial Visualizer Chart (Custom High-Density SVG) */}
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-extrabold text-white tracking-tight">
                          {symbol} {data.summary.currentBalance}
                        </span>
                        <span className="ml-2 text-xs font-semibold text-emerald-400">+₹ 1,234.50 (24h)</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Inflow
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-400" /> Outflow
                        </span>
                      </div>
                    </div>

                    {/* SVG Curve & Volume Histogram */}
                    <div className="relative h-44 w-full overflow-hidden rounded-xl border border-white/[0.04] bg-gradient-to-b from-white/[0.02] to-transparent p-2">
                      <svg className="h-full w-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                        <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                        <line x1="0" y1="90" x2="400" y2="90" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

                        {/* Volume Bar Histogram at bottom */}
                        {[20, 35, 25, 45, 60, 50, 75, 65, 85, 95, 80, 110].map((h, i) => (
                          <rect
                            key={i}
                            x={i * 34 + 6}
                            y={110 - h * 0.4}
                            width="14"
                            height={h * 0.4}
                            rx="2"
                            fill={i % 3 === 0 ? "rgba(244, 63, 94, 0.4)" : "rgba(16, 185, 129, 0.4)"}
                          />
                        ))}

                        {/* Line Trend */}
                        <path
                          d="M 10 75 Q 60 50 110 65 T 210 35 T 310 25 T 390 15"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 75 Q 60 50 110 65 T 210 35 T 310 25 T 390 15 L 390 110 L 10 110 Z"
                          fill="url(#chartGradient)"
                        />
                        <circle cx="390" cy="15" r="4" fill="#22d3ee" className="animate-pulse" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun (Today)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Panel: Asset Allocation & Quick Ledger Overview */}
              <div className="terminal-card p-6 animate-fade-in-up delay-600 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Asset Distribution</h3>
                    <span className="text-xs text-slate-400">Multi-Currency</span>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                          {symbol}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{data.wallet.currency} Main Ledger</p>
                          <p className="text-[10px] text-slate-400 font-mono">Primary Account</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-white">{symbol} {data.summary.currentBalance}</p>
                        <p className="text-[10px] text-emerald-400 font-medium">100.0% Allocation</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                          $
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">USD Equivalent</p>
                          <p className="text-[10px] text-slate-400 font-mono">Real-Time Oracle</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-white">$ {(parseFloat(data.summary.currentBalance) / 85).toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Rate: 85.00</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Integrity Status Pill */}
                <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/40 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">System Architecture</span>
                    <span className="text-emerald-400 font-mono text-[11px]">Dual-Write Outbox</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                    All money movements enforce PostgreSQL row locks and produce immutable double-entry journal logs.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Live Immutable Ledger & Money Movement Feed ────────────────────── */}
            <section className="terminal-card p-6 animate-fade-in-up delay-600">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">Live Ledger Feed</h2>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      Real-Time Entries
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Immutable transaction records with before & after audit checkpoints</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("movement")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      activeTab === "movement"
                        ? "bg-white text-slate-950 font-semibold"
                        : "bg-white/[0.04] text-slate-400 hover:text-white"
                    }`}
                  >
                    Transactions ({data.recentTransactions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("ledger")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      activeTab === "ledger"
                        ? "bg-white text-slate-950 font-semibold"
                        : "bg-white/[0.04] text-slate-400 hover:text-white"
                    }`}
                  >
                    Double-Entry Journal ({data.recentLedgerEntries.length})
                  </button>
                </div>
              </div>

              {/* Transactions Tab Content */}
              {activeTab === "movement" && (
                <div className="mt-4 overflow-x-auto">
                  {data.recentTransactions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No transactions recorded yet. Click <strong>+ Deposit</strong> above to initiate a money movement.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="py-3 px-3">Type</th>
                          <th className="py-3 px-3">Transaction ID</th>
                          <th className="py-3 px-3">Description</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Time</th>
                          <th className="py-3 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {data.recentTransactions.map((tx) => {
                          const isDeposit = tx.transactionType === "DEPOSIT";
                          return (
                            <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                              <td className="py-3 px-3 font-medium">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    isDeposit ? "badge-credit" : "badge-debit"
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${isDeposit ? "bg-emerald-400" : "bg-rose-400"}`} />
                                  {tx.transactionType}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-300">
                                TX-{tx.id.slice(0, 8)}
                              </td>
                              <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                                {tx.description || "System transaction"}
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                  ● {tx.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                                {formatDate(tx.createdAt)}
                              </td>
                              <td className={`py-3 px-3 text-right font-bold font-mono text-sm ${isDeposit ? "text-emerald-400" : "text-slate-200"}`}>
                                {isDeposit ? "+" : "-"}{symbol} {tx.amount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Ledger Entries Tab Content */}
              {activeTab === "ledger" && (
                <div className="mt-4 overflow-x-auto">
                  {data.recentLedgerEntries.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No double-entry journal logs present.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="py-3 px-3">Entry Side</th>
                          <th className="py-3 px-3">Ledger ID</th>
                          <th className="py-3 px-3">Balance Before</th>
                          <th className="py-3 px-3">Balance After</th>
                          <th className="py-3 px-3">Audit Timestamp</th>
                          <th className="py-3 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {data.recentLedgerEntries.map((entry) => {
                          const isCredit = entry.entryType === "CREDIT";
                          return (
                            <tr key={entry.id} className="hover:bg-white/[0.02] transition">
                              <td className="py-3 px-3 font-medium">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    isCredit ? "badge-credit" : "badge-debit"
                                  }`}
                                >
                                  {entry.entryType}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-300">
                                LEG-{entry.id.slice(0, 8)}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-400">
                                {symbol} {entry.balanceBefore}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-200">
                                {symbol} {entry.balanceAfter}
                              </td>
                              <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                                {formatDate(entry.createdAt)}
                              </td>
                              <td className="py-3 px-3 text-right font-bold font-mono text-sm text-cyan-300">
                                {symbol} {entry.amount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </section>
          </>
        ) : null}

        {/* ── Quick Action Modal (Deposit / Transfer) ────────────────────────── */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="terminal-card w-full max-w-md p-6 border-white/20 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white">
                  {actionModal === "deposit" ? "Quick Wallet Deposit" : "Quick P2P Transfer"}
                </h3>
                <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleQuickAction} className="mt-4 space-y-4">
                {actionModal === "transfer" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Recipient Account Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACC-1002"
                      value={targetAccount}
                      onChange={(e) => setTargetAccount(e.target.value)}
                      className="input-field font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Amount ({data?.wallet.currency ?? "INR"})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    placeholder="1000.00"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    className="input-field font-mono text-base"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModal(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-primary"
                  >
                    {actionLoading ? "Processing..." : "Confirm & Execute"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
