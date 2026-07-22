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

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadWallet() {
    setLoading(true);
    try {
      const response = await fetch("/api/wallet", { credentials: "include" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.status === 404) {
          setWallet(null);
          setError(null);
          return;
        }
        throw new Error(payload?.error ?? "Failed to load wallet");
      }

      const payload = (await response.json()) as { wallet: WalletData };
      setWallet(payload.wallet);
      setError(null);
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
      setMessage("Wallet ready.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    (async () => {
      if (active) {
        await loadWallet();
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Wallet</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Your account wallet</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Create your wallet once, then keep track of balance, account number, and status from here.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Wallet actions</h2>
            <p className="mt-2 text-sm text-slate-400">Create the wallet if it does not already exist.</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={createWallet}
                disabled={actionLoading}
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Working..." : wallet ? "Refresh wallet" : "Create wallet"}
              </button>
              <button
                onClick={loadWallet}
                disabled={loading}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "Reload wallet"}
              </button>
            </div>
            {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Wallet details</h2>
            {loading ? (
              <p className="mt-6 text-sm text-slate-400">Loading wallet...</p>
            ) : wallet ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Account number</p>
                  <p className="mt-2 text-lg font-medium text-white">{wallet.accountNumber}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Balance</p>
                  <p className="mt-2 text-lg font-medium text-white">
                    {wallet.currency} {wallet.balance}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Status</p>
                  <p className="mt-2 text-lg font-medium text-white">{wallet.status}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Created</p>
                  <p className="mt-2 text-lg font-medium text-white">{new Date(wallet.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-400">No wallet exists yet. Create one to begin.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
