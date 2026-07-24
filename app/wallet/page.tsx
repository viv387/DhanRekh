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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function createWallet() {
    setActionLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create wallet");
      }

      const payload = (await response.json()) as { wallet: WalletData };
      setWallet(payload.wallet);
      setMessage("Wallet initialized.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setMessage(null);
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Conversion failed");

      setMessage(`Converted ${convertAmount} ${wallet?.currency} to ${targetCurrency} at rate ${data.rate.toFixed(4)}`);
      setConvertAmount("");
      await loadWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSchedulePayment(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setMessage(null);
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scheduling failed");

      setMessage(`Scheduled ${schedFreq} payment of $${schedAmount} to ${schedReceiver}`);
      setSchedReceiver("");
      setSchedAmount("");
      await loadWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scheduling failed");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  return (
    <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Wallet Management</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Enterprise Multi-Currency Wallet</h1>
          </div>
          <a href="/dashboard" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            Back to Dashboard
          </a>
        </header>

        {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</div>}
        {message && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">{message}</div>}

        <section className="grid gap-6 md:grid-cols-2">
          {/* Wallet Info Card */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Wallet Status</h2>
            {loading ? (
              <p className="mt-4 text-sm text-slate-400">Loading wallet...</p>
            ) : wallet ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Account Number</p>
                  <p className="mt-1 text-2xl font-mono font-bold text-cyan-300">{wallet.accountNumber}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Current Balance</p>
                  <p className="mt-1 text-3xl font-extrabold text-white">{wallet.currency} {wallet.balance}</p>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-slate-400">No active wallet found.</p>
                <button onClick={createWallet} disabled={actionLoading} className="mt-4 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950">
                  Initialize Wallet
                </button>
              </div>
            )}
          </div>

          {/* Multi-Currency Conversion Card */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Multi-Currency Exchange</h2>
            <p className="mt-1 text-xs text-slate-400">Convert funds via ExchangeRateProvider</p>
            <form onSubmit={handleConvert} className="mt-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400">Target Currency</label>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Amount to Convert</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="50.00"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
                />
              </div>
              <button type="submit" disabled={actionLoading || !wallet} className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-slate-950">
                Execute Conversion
              </button>
            </form>
          </div>
        </section>

        {/* Scheduled Payments & Fraud Alerts Section */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Scheduled Payments */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Schedule Automated Payment</h2>
            <form onSubmit={handleSchedulePayment} className="mt-4 space-y-3">
              <input
                type="text"
                required
                placeholder="Receiver Account (ACC-XXXXXX)"
                value={schedReceiver}
                onChange={(e) => setSchedReceiver(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              />
              <input
                type="number"
                step="0.01"
                required
                placeholder="Amount"
                value={schedAmount}
                onChange={(e) => setSchedAmount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              />
              <select
                value={schedFreq}
                onChange={(e) => setSchedFreq(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none"
              >
                <option value="ONCE">ONCE (One-time)</option>
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
              </select>
              <button type="submit" disabled={actionLoading} className="w-full rounded-xl bg-purple-500 py-3 text-sm font-semibold text-white">
                Save Scheduled Payment
              </button>
            </form>

            <div className="mt-6 space-y-2">
              <p className="text-xs uppercase tracking-widest text-slate-400">Active Schedules ({scheduledPayments.length})</p>
              {scheduledPayments.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs flex justify-between">
                  <div>
                    <span className="font-semibold text-cyan-300">{p.frequency}</span> &rarr; {p.receiverAccountNumber}
                    <p className="text-slate-400">${p.amount}</p>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-emerald-300">{p.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Security Alerts */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Security & Fraud Engine</h2>
            <p className="mt-1 text-xs text-slate-400">Real-time risk scoring and alert feed</p>
            <div className="mt-6 space-y-3">
              {fraudAlerts.length === 0 ? (
                <p className="text-sm text-slate-400">No security or fraud flags detected.</p>
              ) : (
                fraudAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-rose-300">Risk Score: {alert.riskScore}/100</span>
                      <span className="text-cyan-300">Confidence: {alert.confidenceScore}%</span>
                    </div>
                    <p className="mt-2 text-slate-300">{alert.reasons}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
