"use client";

import { useEffect, useMemo, useState } from "react";

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
  ledgerEntries: Array<{
    id: string;
    entryType: string;
    amount: string;
    balanceBefore: string;
    balanceAfter: string;
  }>;
};

type LedgerData = {
  id: string;
  transactionId: string;
  walletId: string;
  entryType: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
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
  const [ledger, setLedger] = useState<LedgerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [receiverAccountNumber, setReceiverAccountNumber] = useState("");
  const [description, setDescription] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [walletResponse, transactionsResponse, ledgerResponse] = await Promise.all([
        fetch("/api/wallet", { credentials: "include" }),
        fetch("/api/transactions", { credentials: "include" }),
        fetch("/api/ledger", { credentials: "include" }),
      ]);

      if (walletResponse.ok) {
        const walletPayload = (await walletResponse.json()) as { wallet: WalletData };
        setWallet(walletPayload.wallet);
      } else if (walletResponse.status === 404) {
        setWallet(null);
      }

      if (transactionsResponse.ok) {
        const transactionsPayload = (await transactionsResponse.json()) as { transactions: TransactionData[] };
        setTransactions(transactionsPayload.transactions);
      }

      if (ledgerResponse.ok) {
        const ledgerPayload = (await ledgerResponse.json()) as { ledger: LedgerData[] };
        setLedger(ledgerPayload.ledger);
      }

      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function submitAction(
    endpoint: string,
    payload: Record<string, unknown>,
    refreshKey: string,
  ) {
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": newIdempotencyKey(),
        },
        credentials: "include",
        body: JSON.stringify({
          ...payload,
          idempotencyKey: refreshKey,
        }),
      });

      if (!response.ok) {
        const payloadData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payloadData?.error ?? "Action failed");
      }

      await loadData();
      setMessage("Transaction complete.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unknown error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeposit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAction("/api/transaction/deposit", {
      amount: Number(depositAmount),
      description: description || undefined,
    }, newIdempotencyKey());
  }

  async function handleWithdraw(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAction("/api/transaction/withdraw", {
      amount: Number(withdrawAmount),
      description: description || undefined,
    }, newIdempotencyKey());
  }

  async function handleTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAction("/api/transaction/transfer", {
      amount: Number(transferAmount),
      receiverAccountNumber,
      description: description || undefined,
    }, newIdempotencyKey());
  }

  useEffect(() => {
    let active = true;

    (async () => {
      if (active) {
        await loadData();
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

  return (
    <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Transactions</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Move money</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Deposit, withdraw, and transfer funds with ledger-backed writes and idempotency.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400">Loading transaction data...</p>
        ) : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <section className="grid gap-6 xl:grid-cols-3">
          <form onSubmit={handleDeposit} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Deposit</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-slate-300">
                Amount
                <input value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} type="number" step="0.01" min="0" required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500" />
              </label>
              <label className="block text-sm text-slate-300">
                Description
                <input value={description} onChange={(event) => setDescription(event.target.value)} type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500" placeholder="Optional note" />
              </label>
              <button disabled={actionLoading} className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">{actionLoading ? "Working..." : "Deposit"}</button>
            </div>
          </form>

          <form onSubmit={handleWithdraw} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Withdraw</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-slate-300">
                Amount
                <input value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} type="number" step="0.01" min="0" required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500" />
              </label>
              <label className="block text-sm text-slate-300">
                Description
                <input value={description} onChange={(event) => setDescription(event.target.value)} type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500" placeholder="Optional note" />
              </label>
              <button disabled={actionLoading} className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60">{actionLoading ? "Working..." : "Withdraw"}</button>
            </div>
          </form>

          <form onSubmit={handleTransfer} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">Transfer</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-slate-300">
                Receiver account number
                <input value={receiverAccountNumber} onChange={(event) => setReceiverAccountNumber(event.target.value)} type="text" required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500" placeholder="ML12345..." />
              </label>
              <label className="block text-sm text-slate-300">
                Amount
                <input value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} type="number" step="0.01" min="0" required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500" />
              </label>
              <label className="block text-sm text-slate-300">
                Description
                <input value={description} onChange={(event) => setDescription(event.target.value)} type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500" placeholder="Optional note" />
              </label>
              <button disabled={actionLoading} className="w-full rounded-full bg-fuchsia-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-fuchsia-300 disabled:opacity-60">{actionLoading ? "Working..." : "Transfer"}</button>
            </div>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Transactions</p>
                <h2 className="mt-2 text-2xl font-semibold">Recent activity</h2>
              </div>
              <button onClick={loadData} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Refresh</button>
            </div>
            <div className="mt-6 space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">No transactions yet.</p>
              ) : (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{transaction.transactionType}</p>
                        <p className="mt-1 text-xs text-slate-400">{transaction.description ?? "No description"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-300">{wallet?.currency ?? "USD"} {transaction.amount}</p>
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

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ledger</p>
            <h2 className="mt-2 text-2xl font-semibold">Latest entries</h2>
            <div className="mt-6 space-y-3">
              {ledger.slice(0, 8).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">No ledger activity yet.</p>
              ) : (
                ledger.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{entry.entryType}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
                      </div>
                      <p className="text-sm font-semibold text-cyan-300">{wallet?.currency ?? "USD"} {entry.amount}</p>
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
      </div>
    </main>
  );
}
