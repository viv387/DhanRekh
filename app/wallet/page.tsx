"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

type WalletData = {
  id: string;
  userId: string;
  accountNumber: string;
  balance: string;
  currency: string;
  status: string;
  createdAt: string;
};

type ScheduledPaymentItem = {
  id: string;
  receiverAccountNumber: string;
  amount: string;
  currency: string;
  frequency: string;
  nextRunAt: string;
  status: string;
};

type FraudAlertItem = {
  id: string;
  riskScore: number;
  confidenceScore: number;
  reasons: string;
  status: string;
  createdAt: string;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPaymentItem[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  // Currency Conversion state
  const [convertAmount, setConvertAmount] = useState("");
  const [targetCurrency, setTargetCurrency] = useState("EUR");

  // Scheduled Payment state
  const [schedReceiver, setSchedReceiver] = useState("");
  const [schedAmount, setSchedAmount] = useState("");
  const [schedFreq, setSchedFreq] = useState("WEEKLY");

  async function loadWallet() {
    setLoading(true);
    try {
      const [wRes, sRes, fRes] = await Promise.all([
        fetch("/api/wallet", { credentials: "include" }),
        fetch("/api/transactions/scheduled", { credentials: "include" }),
        fetch("/api/fraud/alerts", { credentials: "include" }),
      ]);

      if (wRes.status === 401 || sRes.status === 401 || fRes.status === 401) {
        router.push("/login");
        return;
      }

      if (wRes.ok) {
        const payload = (await wRes.json()) as { wallet: WalletData };
        setWallet(payload.wallet);
      }

      if (sRes.ok) {
        const sPayload = (await sRes.json()) as { scheduledPayments: ScheduledPaymentItem[] };
        setScheduledPayments(sPayload.scheduledPayments ?? []);
      }

      if (fRes.ok) {
        const fPayload = (await fRes.json()) as { fraudAlerts: FraudAlertItem[] };
        setFraudAlerts(fPayload.fraudAlerts ?? []);
      }
    } catch (loadError) {
      toast({
        title: "Error loading wallet",
        description: loadError instanceof Error ? loadError.message : "Unknown error",

      });
    } finally {
      setLoading(false);
    }
  }

  async function createWallet() {
    setActionLoading(true);
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create wallet");
      }

      const payload = (await response.json()) as { wallet: WalletData };
      setWallet(payload.wallet);
      toast({
        title: "Wallet Created",
        description: "Wallet successfully initialized.",
      });
    } catch (createError) {
      toast({
        title: "Error",
        description: createError instanceof Error ? createError.message : "Unknown error",

      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/wallet/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fromCurrency: wallet?.currency ?? "USD",
          toCurrency: targetCurrency,
          amount: Number(convertAmount),
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Conversion failed");

      toast({
        title: "Conversion Successful",
        description: `Converted ${convertAmount} ${wallet?.currency} to ${targetCurrency} at rate ${data.rate.toFixed(4)}`,
      });
      setConvertAmount("");
      await loadWallet();
    } catch (err) {
      toast({
        title: "Conversion Failed",
        description: err instanceof Error ? err.message : "Conversion failed",

      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSchedulePayment(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/transactions/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverAccountNumber: schedReceiver,
          amount: Number(schedAmount),
          frequency: schedFreq,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scheduling failed");

      toast({
        title: "Payment Scheduled",
        description: `Scheduled ${schedFreq} payment of ${wallet?.currency ?? "USD"} ${schedAmount} to ${schedReceiver}`,
      });
      setSchedReceiver("");
      setSchedAmount("");
      await loadWallet();
    } catch (err) {
      toast({
        title: "Scheduling Failed",
        description: err instanceof Error ? err.message : "Scheduling failed",

      });
    } finally {
      setActionLoading(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyToClipboard = () => {
    if (wallet?.accountNumber) {
      navigator.clipboard.writeText(wallet.accountNumber);
      setCopied(true);
      toast({ title: "Copied!", description: "Account number copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-emerald-400 border-emerald-400/30 bg-emerald-950/30";
    if (score < 70) return "text-amber-400 border-amber-400/30 bg-amber-950/30";
    return "text-rose-400 border-rose-400/30 bg-rose-950/30";
  };

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-fade-in text-white">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 animate-slide-in-left">Wallet Management</p>
          <h1 className="text-3xl font-bold tracking-tight animate-fade-in-up delay-100">Enterprise Multi-Currency Wallet</h1>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {/* Wallet Info Card */}
          <div className="glass-card p-6 animate-scale-in delay-200">
            <h2 className="text-2xl font-semibold mb-6">Wallet Status</h2>
            {loading ? (
              <div className="space-y-4">
                <div className="skeleton h-20 w-full rounded-2xl" />
                <div className="skeleton h-24 w-full rounded-2xl" />
              </div>
            ) : wallet ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 flex justify-between items-center group">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">Account Number</p>
                    <p className="mt-1 text-2xl font-mono font-bold text-cyan-300 transition-transform group-hover:scale-105 origin-left">{wallet.accountNumber}</p>
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    title="Copy Account Number"
                  >
                    {copied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 animate-bar-grow w-full" />
                  <p className="text-xs uppercase tracking-widest text-slate-400 mt-2">Current Balance</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-medium text-cyan-400">{wallet.currency}</span>
                    <p className="text-4xl font-extrabold text-white">{wallet.balance}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-slate-400 mb-4">No active wallet found. Please initialize your enterprise wallet to get started.</p>
                <button onClick={createWallet} disabled={actionLoading} className="btn-primary w-full py-3">
                  {actionLoading ? "Initializing..." : "Initialize Wallet"}
                </button>
              </div>
            )}
          </div>

          {/* Multi-Currency Conversion Card */}
          <div className="glass-card p-6 animate-scale-in delay-300">
            <h2 className="text-2xl font-semibold">Multi-Currency Exchange</h2>
            <p className="mt-1 text-xs text-slate-400 mb-6">Convert funds with real-time rates</p>
            {loading ? (
              <div className="space-y-4 mt-6">
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-12 w-full rounded-xl" />
              </div>
            ) : (
              <form onSubmit={handleConvert} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Target Currency</label>
                  <select
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value)}
                    className="input-field w-full p-3"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Amount to Convert</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="50.00"
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    className="input-field w-full p-3"
                  />
                </div>
                <button type="submit" disabled={actionLoading || !wallet} className="btn-emerald w-full py-3">
                  {actionLoading ? "Executing..." : "Execute Conversion"}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Scheduled Payments & Fraud Alerts Section */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Scheduled Payments */}
          <div className="glass-card p-6 animate-fade-in-up delay-400">
            <h2 className="text-2xl font-semibold mb-4">Schedule Automated Payment</h2>
            
            {loading ? (
               <div className="space-y-3">
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-12 w-full rounded-xl" />
               </div>
            ) : (
              <form onSubmit={handleSchedulePayment} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Receiver Account</label>
                  <input
                    type="text"
                    required
                    placeholder="ACC-XXXXXX"
                    value={schedReceiver}
                    onChange={(e) => setSchedReceiver(e.target.value)}
                    className="input-field w-full p-3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={schedAmount}
                      onChange={(e) => setSchedAmount(e.target.value)}
                      className="input-field w-full p-3"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Frequency</label>
                    <select
                      value={schedFreq}
                      onChange={(e) => setSchedFreq(e.target.value)}
                      className="input-field w-full p-3"
                    >
                      <option value="ONCE">ONCE</option>
                      <option value="DAILY">DAILY</option>
                      <option value="WEEKLY">WEEKLY</option>
                      <option value="MONTHLY">MONTHLY</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={actionLoading} className="btn-purple w-full py-3">
                  Save Scheduled Payment
                </button>
              </form>
            )}

            <div className="mt-8 space-y-3">
              <p className="text-xs uppercase tracking-widest text-slate-400 border-b border-white/10 pb-2">Active Schedules ({scheduledPayments.length})</p>
              {loading ? (
                <div className="skeleton h-16 w-full rounded-xl" />
              ) : scheduledPayments.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">No active scheduled payments.</p>
              ) : (
                scheduledPayments.map((p) => (
                  <div key={p.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-4 flex justify-between items-center transition hover:bg-slate-900/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-cyan-300 text-xs tracking-wider">{p.frequency}</span> 
                        <span className="text-slate-500">&rarr;</span>
                        <span className="text-sm font-medium text-white">{p.receiverAccountNumber}</span>
                      </div>
                      <p className="text-slate-400 text-sm font-medium">{p.currency} {p.amount}</p>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-300">{p.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Fraud Security Alerts */}
          <div className="glass-card p-6 animate-fade-in-up delay-500">
            <div className="flex items-center gap-3 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
              <h2 className="text-2xl font-semibold">Security & Fraud Engine</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400 mb-6">Real-time risk scoring and alert feed</p>
            
            <div className="space-y-4">
              {loading ? (
                <>
                  <div className="skeleton h-24 w-full rounded-xl" />
                  <div className="skeleton h-24 w-full rounded-xl" />
                </>
              ) : fraudAlerts.length === 0 ? (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-6 flex flex-col items-center justify-center text-center">
                  <div className="bg-emerald-400/10 p-3 rounded-full mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-emerald-300">All Systems Secure</p>
                  <p className="text-xs text-emerald-400/70 mt-1">No security or fraud flags detected.</p>
                </div>
              ) : (
                fraudAlerts.map((alert) => (
                  <div key={alert.id} className={`rounded-xl border p-4 ${getRiskColor(alert.riskScore)}`}>
                    <div className="flex justify-between items-center font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-current animate-pulse"></span>
                        <span className="text-sm">Risk Score: {alert.riskScore}/100</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10">Confidence: {alert.confidenceScore}%</span>
                    </div>
                    <p className="text-sm opacity-90">{alert.reasons}</p>
                    <p className="text-[10px] uppercase tracking-wider opacity-60 mt-3">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
