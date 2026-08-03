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
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function MetricCard({
  title,
  value,
  subtitle,
  delayClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  delayClass: string;
}) {
  return (
    <div className={`glass-card animate-fade-in-up ${delayClass}`}>
      <p className="text-xs uppercase tracking-[0.28em] text-slate-300">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
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
          throw new Error(payload?.error ?? "Failed to load dashboard");
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
            message: loadError instanceof Error ? loadError.message : "Unknown error",
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

  async function markAllNotificationsRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast({
          title: "Success",
          message: "All notifications marked as read",
          type: "success",
        });
      }
    } catch {
      toast({
        title: "Error",
        message: "Failed to mark notifications as read",
        type: "error",
      });
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between animate-fade-in-up delay-100">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300">Overview</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Welcome back{user?.username ? `, ${user.username}` : ""}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Here is your live account summary, transaction volume, and immutable ledger activity.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-cyan-200 transition hover:bg-cyan-400/20"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {showNotifications && (
          <section className="glass-card animate-fade-in-up delay-100 border-cyan-500/20 bg-slate-950/80">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications ({notifications.length})</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="mt-4 max-h-60 space-y-3 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-400">No notifications found.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-4 text-sm ${
                      n.isRead
                        ? "border-white/5 bg-white/5 text-slate-300"
                        : "border-cyan-500/30 bg-cyan-950/30 text-white"
                    }`}
                  >
                    <div className="flex justify-between">
                      <p className="font-semibold">{n.title}</p>
                      <span className="text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-slate-300">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {loading ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`h-32 skeleton rounded-3xl animate-fade-in-up delay-${(index + 1) * 100}`} />
            ))}
          </section>
        ) : data ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Current balance"
                value={`${data.wallet.currency} ${data.summary.currentBalance}`}
                subtitle={`Wallet ${data.wallet.accountNumber}`}
                delayClass="delay-100"
              />
              <MetricCard
                title="Transactions"
                value={String(data.summary.transactionCount)}
                subtitle={`${data.summary.ledgerEntryCount} ledger entries recorded`}
                delayClass="delay-200"
              />
              <MetricCard
                title="Inflow"
                value={`${data.wallet.currency} ${data.summary.totalDeposited}`}
                subtitle={`${data.summary.depositCount} deposits completed`}
                delayClass="delay-300"
              />
              <MetricCard
                title="Outflow"
                value={`${data.wallet.currency} ${data.summary.totalWithdrawn}`}
                subtitle={`${data.summary.withdrawCount} withdrawals and ${data.summary.transferCount} transfers`}
                delayClass="delay-400"
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <div className="glass-card animate-fade-in-up delay-500">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recent transactions</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Money movement</h2>
                  </div>
                  <p className="text-sm text-slate-400">Latest 5 records</p>
                </div>
                <div className="mt-6 space-y-3">
                  {data.recentTransactions.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                      No transactions yet.
                    </p>
                  ) : (
                    data.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{transaction.transactionType}</p>
                            <p className="mt-1 text-xs text-slate-400">{transaction.description ?? "No description"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-300">{data.wallet.currency} {transaction.amount}</p>
                            <p className="mt-1 text-xs text-slate-400">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                          <span className="rounded-full border border-white/10 px-2 py-1">{transaction.status}</span>
                          <span className="rounded-full border border-white/10 px-2 py-1">TX {transaction.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-card animate-fade-in-up delay-600">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recent ledger</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Immutable entries</h2>
                <div className="mt-6 space-y-3">
                  {data.recentLedgerEntries.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                      No ledger entries yet.
                    </p>
                  ) : (
                    data.recentLedgerEntries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-white">{entry.entryType}</p>
                            <p className="mt-1 text-xs text-slate-400">Wallet {entry.walletId.slice(0, 8)} · {formatDate(entry.createdAt)}</p>
                          </div>
                          <p className="text-sm font-semibold text-cyan-300">{data.wallet.currency} {entry.amount}</p>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                          <div className="rounded-xl border border-white/10 p-3">Before {entry.balanceBefore}</div>
                          <div className="rounded-xl border border-white/10 p-3">After {entry.balanceAfter}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
