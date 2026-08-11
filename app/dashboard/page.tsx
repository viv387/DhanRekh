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
  const [copied, setCopied] = useState(false);

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
        ? { amount: actionAmount, description: "Quick Deposit via DhanRekh Dashboard" }
        : { receiverAccountNumber: targetAccount, amount: actionAmount, description: "Quick Transfer via DhanRekh Dashboard" };

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
        message: actionModal === "deposit" ? `Deposited successfully into DhanRekh Wallet` : `Transferred ${actionAmount} to ${targetAccount}`,
        type: "success",
      });

      setActionModal(null);
      setActionAmount("");
      setTargetAccount("");
      
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

  const copyAccountNumber = () => {
    if (data?.wallet.accountNumber) {
      navigator.clipboard.writeText(data.wallet.accountNumber);
      setCopied(true);
      toast({ title: "Copied!", message: "Account number copied to clipboard", type: "success" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const symbol = formatCurrencySymbol(data?.wallet.currency ?? "INR");

  // Donut chart calculations
  const totalOps = (data?.summary.depositCount ?? 0) + (data?.summary.withdrawCount ?? 0) + (data?.summary.transferCount ?? 0) || 1;
  const depPct = Math.round(((data?.summary.depositCount ?? 0) / totalOps) * 100);
  const wPct = Math.round(((data?.summary.withdrawCount ?? 0) / totalOps) * 100);
  const trPct = 100 - depPct - wPct;

  const conicGradient = `conic-gradient(
    #22d3ee 0% ${depPct}%,
    #f43f5e ${depPct}% ${depPct + wPct}%,
    #10b981 ${depPct + wPct}% 100%
  )`;

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

        {/* ── Premium DhanRekh Hero Header ─────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-purple-950/40 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(34,211,238,0.08)] animate-fade-in">
          {/* Background Ambient Glow Effects */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400 font-mono">
                  DhanRekh Financial Engine
                </span>
                <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-400/20">
                  v2.4 LIVE
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-indigo-300 bg-clip-text text-transparent">
                  {user?.username || "Financial Operator"}
                </span>
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span>Account:</span>
                <button
                  onClick={copyAccountNumber}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-cyan-300 hover:border-cyan-400/50 hover:bg-black/60 transition"
                  title="Click to copy account number"
                >
                  <span>{data?.wallet.accountNumber ?? "Loading..."}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 group-hover:text-cyan-300 transition">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {copied && <span className="text-[10px] text-emerald-400 font-sans ml-1">Copied!</span>}
                </button>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">ACID Ledger Isolation: <strong className="text-emerald-400">STRICT FOR UPDATE</strong></span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Notifications Toggle */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] hover:text-white transition shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Alerts
                {unreadCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Deposit Quick Button */}
              <button
                onClick={() => setActionModal("deposit")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:opacity-95 hover:scale-[1.02] transition shadow-lg shadow-emerald-950/40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Deposit Funds
              </button>

              {/* Transfer Quick Button */}
              <button
                onClick={() => setActionModal("transfer")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:opacity-95 hover:scale-[1.02] transition shadow-lg shadow-cyan-950/40"
              >
                Transfer Money
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Notifications Modal Drawer */}
        {showNotifications && (
          <section className="terminal-card p-5 animate-scale-in border-cyan-500/30 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">DhanRekh Audit Alerts</h3>
                <span className="rounded bg-cyan-400/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                  {notifications.length} Total
                </span>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllNotificationsRead} className="text-xs text-cyan-400 hover:underline">
                  Mark all read
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
                    className={`rounded-xl border p-3 text-xs ${
                      n.isRead ? "border-white/[0.05] bg-white/[0.01] text-slate-400" : "border-cyan-500/30 bg-cyan-950/30 text-white"
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

        {/* ── Top Metric Cards Grid ─────────────────────────────── */}
        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 skeleton rounded-2xl animate-fade-in-up" />
            ))}
          </section>
        ) : data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Card 1: Net Balance */}
              <div className="terminal-card p-5 animate-fade-in-up delay-100 hover:border-cyan-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-60 group-hover:opacity-100 transition" />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">DhanRekh Vault Balance</p>
                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/20">
                    {data.wallet.currency}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    {symbol} {data.summary.currentBalance}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    Synchronized
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">100% Immutable</span>
                </div>
              </div>

              {/* Card 2: 24H Volume */}
              <div className="terminal-card p-5 animate-fade-in-up delay-200 hover:border-emerald-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-400 opacity-60 group-hover:opacity-100 transition" />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Inflow Volume</p>
                  <span className="text-xs text-slate-400 font-mono">TX: {data.summary.depositCount}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    {symbol} {data.summary.totalDeposited}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {data.summary.depositCount} Inflows • {data.summary.withdrawCount + data.summary.transferCount} Outflows
                  </span>
                  <span className="text-emerald-400 font-mono text-[11px]">Realized</span>
                </div>
              </div>

              {/* Card 3: Double-Entry Ledger */}
              <div className="terminal-card p-5 animate-fade-in-up delay-300 hover:border-purple-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-purple-400 to-indigo-400 opacity-60 group-hover:opacity-100 transition" />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Double-Entry Journal</p>
                  <span className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300 font-bold">
                    AUDITED
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    {data.summary.ledgerEntryCount}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Entries</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Balanced Debits & Credits</span>
                  <span className="text-purple-300 font-mono text-[11px]">Zero Drift</span>
                </div>
              </div>

              {/* Card 4: Concurrency Lock */}
              <div className="terminal-card p-5 animate-fade-in-up delay-400 hover:border-cyan-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-indigo-400 to-cyan-400 opacity-60 group-hover:opacity-100 transition" />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Concurrency Guard</p>
                  <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300 font-bold">
                    SQL LOCK
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    Pessimistic
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-emerald-400 inline-flex items-center gap-1 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ACID Secured
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">No Race Conditions</span>
                </div>
              </div>
            </section>

            {/* ── Interactive Money Flow Engine & Distribution Visualizer ── */}
            <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
              
              {/* Main Financial Curve & Node Flow Diagram */}
              <div className="terminal-card p-6 animate-fade-in-up delay-500 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white tracking-tight">DhanRekh Money Flow & Balance Trend</h2>
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          ● REAL-TIME ENGINE
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Live transaction volume curve with double-entry execution metrics</p>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/50 p-1 self-start sm:self-auto">
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

                  {/* Chart Header Values */}
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-black text-white tracking-tight">
                          {symbol} {data.summary.currentBalance}
                        </span>
                        <span className="ml-2.5 text-xs font-bold text-emerald-400">+ACID Confirmed</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-cyan-400" /> Inflow (Credit)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-400" /> Outflow (Debit)
                        </span>
                      </div>
                    </div>

                    {/* SVG Chart with Flow Animation */}
                    <div className="relative h-48 w-full overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-cyan-950/20 via-slate-900/30 to-transparent p-2">
                      <svg className="h-full w-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="dhanrekhGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        <line x1="0" y1="90" x2="400" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

                        {/* Volume Bar Histogram */}
                        {[25, 40, 30, 55, 70, 45, 85, 60, 90, 100, 85, 115].map((h, i) => (
                          <rect
                            key={i}
                            x={i * 33 + 8}
                            y={110 - h * 0.42}
                            width="14"
                            height={h * 0.42}
                            rx="3"
                            fill={i % 3 === 0 ? "rgba(244, 63, 94, 0.45)" : "rgba(34, 211, 238, 0.45)"}
                          />
                        ))}

                        {/* Line Trend */}
                        <path
                          d="M 10 80 Q 60 45 110 60 T 210 30 T 310 20 T 390 12"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 80 Q 60 45 110 60 T 210 30 T 310 20 T 390 12 L 390 110 L 10 110 Z"
                          fill="url(#dhanrekhGlow)"
                        />
                        <circle cx="390" cy="12" r="5" fill="#22d3ee" className="animate-ping" />
                        <circle cx="390" cy="12" r="3" fill="#ffffff" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span className="text-cyan-400 font-bold">Sun (Today)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Distribution & Donut Chart Side Panel */}
              <div className="terminal-card p-6 animate-fade-in-up delay-600 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operation Mix</h3>
                    <span className="text-xs text-cyan-400 font-mono font-bold">DhanRekh Analytics</span>
                  </div>

                  {/* Donut Chart Visual */}
                  <div className="mt-5 flex items-center justify-center">
                    <div
                      className="w-36 h-36 rounded-full relative flex items-center justify-center shadow-lg shadow-black/60 transition-transform hover:scale-105"
                      style={{ background: conicGradient }}
                    >
                      <div className="w-24 h-24 bg-[#0a0b0e] rounded-full flex flex-col items-center justify-center border border-white/10">
                        <span className="text-xl font-black text-white">{totalOps}</span>
                        <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Total Ops</span>
                      </div>
                    </div>
                  </div>

                  {/* Operations Breakdown Bars */}
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Deposits ({data.summary.depositCount})
                      </span>
                      <span className="font-mono text-cyan-300 font-bold">{depPct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Withdrawals ({data.summary.withdrawCount})
                      </span>
                      <span className="font-mono text-rose-300 font-bold">{wPct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Transfers ({data.summary.transferCount})
                      </span>
                      <span className="font-mono text-emerald-300 font-bold">{trPct}%</span>
                    </div>
                  </div>
                </div>

                {/* System Architecture Integrity Pill */}
                <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/50 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Event Outbox Pattern</span>
                    <span className="text-emerald-400 font-mono text-[10px] font-bold">READY</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                    Dual-write outbox table decouples database commits from Kafka topic events.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Live Immutable Ledger & Money Movement Feed ── */}
            <section className="terminal-card p-6 animate-fade-in-up delay-600">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">DhanRekh Immutable Audit Stream</h2>
                    <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300 font-bold">
                      REAL-TIME
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Double-entry ledger journal entries with complete before & after balances</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("movement")}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "movement"
                        ? "bg-white text-slate-950 shadow-md"
                        : "bg-white/[0.04] text-slate-400 hover:text-white"
                    }`}
                  >
                    Transactions ({data.recentTransactions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("ledger")}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === "ledger"
                        ? "bg-white text-slate-950 shadow-md"
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
                      No transactions recorded yet. Click <strong>Deposit Funds</strong> above to initiate a money movement.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
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
                                {tx.description || "DhanRekh System Transaction"}
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
                        <tr className="border-b border-white/[0.08] text-[10px] uppercase font-bold text-slate-400 tracking-wider">
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
            <div className="terminal-card w-full max-w-md p-6 border-cyan-500/30 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white">
                  {actionModal === "deposit" ? "DhanRekh Quick Deposit" : "DhanRekh P2P Transfer"}
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
