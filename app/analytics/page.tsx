"use client";

import { useEffect, useState } from "react";

type AnalyticsSummary = {
  wallet: {
    id: string;
    accountNumber: string;
    balance: string;
    currency: string;
  };
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
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Failed to load analytics");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading data");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Asynchronous Precomputed Analytics</p>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">System & Wallet Performance</h1>
          </div>
          <a href="/dashboard" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            Back to Dashboard
          </a>
        </header>

        {loading ? (
          <p className="mt-8 text-slate-400">Loading precomputed analytics from Redis cache...</p>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-rose-200">{error}</div>
        ) : data ? (
          <div className="mt-8 space-y-8">
            {/* Top Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-950/20 p-6 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-widest text-cyan-300">Total Deposits</p>
                <p className="mt-2 text-4xl font-extrabold text-white">${data.summary.totalDeposited}</p>
                <p className="mt-2 text-sm text-slate-400">{data.summary.depositCount} total deposit operations</p>
              </div>
              <div className="rounded-[2rem] border border-purple-500/20 bg-purple-950/20 p-6 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-widest text-purple-300">Total Withdrawals</p>
                <p className="mt-2 text-4xl font-extrabold text-white">${data.summary.totalWithdrawn}</p>
                <p className="mt-2 text-sm text-slate-400">{data.summary.withdrawCount} total withdrawal operations</p>
              </div>
              <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-950/20 p-6 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-widest text-emerald-300">Total Peer Transfers</p>
                <p className="mt-2 text-4xl font-extrabold text-white">${data.summary.totalTransferred}</p>
                <p className="mt-2 text-sm text-slate-400">{data.summary.transferCount} peer-to-peer transfers</p>
              </div>
            </div>

            {/* Breakdown Chart & Details */}
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-white">Transaction Distribution Breakdown</h3>
              <p className="mt-1 text-sm text-slate-400">Maintained in background by Kafka analytics consumers</p>

              <div className="mt-8 space-y-6">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Deposits ({data.summary.depositCount})</span>
                    <span className="font-semibold text-cyan-400">${data.summary.totalDeposited}</span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full bg-cyan-400 transition-all"
                      style={{
                        width: `${
                          Math.min(
                            100,
                            (data.summary.depositCount / (data.summary.transactionCount || 1)) * 100
                          )
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Withdrawals ({data.summary.withdrawCount})</span>
                    <span className="font-semibold text-purple-400">${data.summary.totalWithdrawn}</span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full bg-purple-400 transition-all"
                      style={{
                        width: `${
                          Math.min(
                            100,
                            (data.summary.withdrawCount / (data.summary.transactionCount || 1)) * 100
                          )
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Transfers ({data.summary.transferCount})</span>
                    <span className="font-semibold text-emerald-400">${data.summary.totalTransferred}</span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full bg-emerald-400 transition-all"
                      style={{
                        width: `${
                          Math.min(
                            100,
                            (data.summary.transferCount / (data.summary.transactionCount || 1)) * 100
                          )
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
