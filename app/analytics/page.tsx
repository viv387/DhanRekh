"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { useToast } from "@/components/ui/Toast";

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
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics", { credentials: "include" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load analytics");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Error loading data");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [router, toast]);

  const getPercentage = (count: number, total: number) => {
    if (!total) return 0;
    return Math.min(100, Math.round((count / total) * 100));
  };

  const depositPercent = data ? getPercentage(data.summary.depositCount, data.summary.transactionCount) : 0;
  const withdrawPercent = data ? getPercentage(data.summary.withdrawCount, data.summary.transactionCount) : 0;
  const transferPercent = data ? getPercentage(data.summary.transferCount, data.summary.transactionCount) : 0;

  // Donut chart logic: percentages out of total *transactions*
  const chartTotal = depositPercent + withdrawPercent + transferPercent || 1;
  const depChart = (depositPercent / chartTotal) * 100;
  const wChart = (withdrawPercent / chartTotal) * 100;
  
  const conicGradient = `conic-gradient(
    #22d3ee 0% ${depChart}%,
    #c084fc ${depChart}% ${depChart + wChart}%,
    #34d399 ${depChart + wChart}% 100%
  )`;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-8 animate-fade-in-up">Analytics & Insights</h1>
        
        {loading ? (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="glass-card p-6 skeleton h-32 rounded-[2rem]"></div>
              <div className="glass-card p-6 skeleton h-32 rounded-[2rem] delay-100"></div>
              <div className="glass-card p-6 skeleton h-32 rounded-[2rem] delay-200"></div>
            </div>
            <div className="glass-card p-8 skeleton h-96 rounded-[2rem] delay-300"></div>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Top Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="glass-card p-6 relative overflow-hidden animate-fade-in-up delay-100 border-t border-t-cyan-500/30">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <div className="w-16 h-16 rounded-full bg-cyan-400 blur-2xl"></div>
                </div>
                <p className="text-xs uppercase tracking-widest text-cyan-400">Total Deposits</p>
                <p className="mt-2 text-4xl font-extrabold text-white">{data.wallet.currency} {data.summary.totalDeposited}</p>
                <p className="mt-2 text-sm text-slate-400">{data.summary.depositCount} operations</p>
              </div>

              <div className="glass-card p-6 relative overflow-hidden animate-fade-in-up delay-200 border-t border-t-purple-500/30">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <div className="w-16 h-16 rounded-full bg-purple-400 blur-2xl"></div>
                </div>
                <p className="text-xs uppercase tracking-widest text-purple-400">Total Withdrawals</p>
                <p className="mt-2 text-4xl font-extrabold text-white">{data.wallet.currency} {data.summary.totalWithdrawn}</p>
                <p className="mt-2 text-sm text-slate-400">{data.summary.withdrawCount} operations</p>
              </div>

              <div className="glass-card p-6 relative overflow-hidden animate-fade-in-up delay-300 border-t border-t-emerald-500/30">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <div className="w-16 h-16 rounded-full bg-emerald-400 blur-2xl"></div>
                </div>
                <p className="text-xs uppercase tracking-widest text-emerald-400">Total Transfers</p>
                <p className="mt-2 text-4xl font-extrabold text-white">{data.wallet.currency} {data.summary.totalTransferred}</p>
                <p className="mt-2 text-sm text-slate-400">{data.summary.transferCount} operations</p>
              </div>
            </div>

            {/* Breakdown Chart & Details */}
            <div className="glass-card p-8 animate-fade-in-up delay-400">
              <h3 className="text-xl font-bold text-white mb-6">Transaction Distribution</h3>
              
              <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start">
                
                {/* Donut Chart Section */}
                <div className="flex flex-col items-center gap-6">
                  <div 
                    className="w-48 h-48 rounded-full relative flex items-center justify-center shadow-lg shadow-black/50"
                    style={{ background: conicGradient }}
                  >
                    {/* Inner hole for donut shape */}
                    <div className="w-32 h-32 bg-[#050816] rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <span className="block text-2xl font-bold text-white">{data.summary.transactionCount}</span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Total</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                      <span className="text-slate-300">Deposits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                      <span className="text-slate-300">Withdrawals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                      <span className="text-slate-300">Transfers</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bars Section */}
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Deposits ({data.summary.depositCount})</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-cyan-400">{data.wallet.currency} {data.summary.totalDeposited}</span>
                        <span className="text-xs text-slate-500 w-8 text-right">{depositPercent}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900/50">
                      <div
                        className="h-full bg-cyan-400 animate-bar-grow rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                        style={{ width: `${depositPercent}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Withdrawals ({data.summary.withdrawCount})</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-purple-400">{data.wallet.currency} {data.summary.totalWithdrawn}</span>
                        <span className="text-xs text-slate-500 w-8 text-right">{withdrawPercent}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900/50">
                      <div
                        className="h-full bg-purple-400 animate-bar-grow rounded-full shadow-[0_0_10px_rgba(192,132,252,0.5)]"
                        style={{ width: `${withdrawPercent}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Transfers ({data.summary.transferCount})</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-400">{data.wallet.currency} {data.summary.totalTransferred}</span>
                        <span className="text-xs text-slate-500 w-8 text-right">{transferPercent}%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900/50">
                      <div
                        className="h-full bg-emerald-400 animate-bar-grow rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                        style={{ width: `${transferPercent}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
