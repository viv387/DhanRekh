import { prisma } from "@/backend/prisma/prisma";
import { ledgerRepository } from "@/backend/repositories/ledger.repository";
import { transactionRepository } from "@/backend/repositories/transaction.repository";
import { walletRepository } from "@/backend/repositories/wallet.repository";
import { HttpError } from "@/backend/utils/http-error";

function normalizeWallet(wallet: {
	id: string;
	userId: string;
	accountNumber: string;
	balance: { toString: () => string };
	currency: string;
	status: string;
	createdAt: Date;
}) {
	return {
		id: wallet.id,
		userId: wallet.userId,
		accountNumber: wallet.accountNumber,
		balance: wallet.balance.toString(),
		currency: wallet.currency,
		status: wallet.status,
		createdAt: wallet.createdAt,
	};
}

function normalizeLedgerEntry(entry: {
	id: string;
	transactionId: string;
	walletId: string;
	entryType: string;
	amount: { toString: () => string };
	balanceBefore: { toString: () => string };
	balanceAfter: { toString: () => string };
	createdAt: Date;
}) {
	return {
		id: entry.id,
		transactionId: entry.transactionId,
		walletId: entry.walletId,
		entryType: entry.entryType,
		amount: entry.amount.toString(),
		balanceBefore: entry.balanceBefore.toString(),
		balanceAfter: entry.balanceAfter.toString(),
		createdAt: entry.createdAt,
	};
}

function normalizeTransaction(transaction: {
	id: string;
	senderWalletId: string | null;
	receiverWalletId: string | null;
	amount: { toString: () => string };
	transactionType: string;
	status: string;
	description: string | null;
	createdAt: Date;
	ledgerEntries?: Array<Parameters<typeof normalizeLedgerEntry>[0]>;
}) {
	return {
		id: transaction.id,
		senderWalletId: transaction.senderWalletId,
		receiverWalletId: transaction.receiverWalletId,
		amount: transaction.amount.toString(),
		transactionType: transaction.transactionType,
		status: transaction.status,
		description: transaction.description,
		createdAt: transaction.createdAt,
		ledgerEntries: transaction.ledgerEntries?.map(normalizeLedgerEntry) ?? [],
	};
}

export const analyticsService = {
	async getDashboardSummary(userId: string) {
		const wallet = await walletRepository.findWithUserByUserId(userId);

		if (!wallet) {
			throw new HttpError(404, "Wallet not found");
		}

		const [transactions, ledgerEntries, transactionTotals, ledgerCount] = await Promise.all([
			transactionRepository.listForWallet(wallet.id),
			ledgerRepository.listForWallet(wallet.id),
			prisma.transaction.groupBy({
				by: ["transactionType"],
				where: {
					OR: [{ senderWalletId: wallet.id }, { receiverWalletId: wallet.id }],
				},
				_count: { transactionType: true },
				_sum: { amount: true },
			}),
			prisma.ledger.count({
				where: { walletId: wallet.id },
			}),
		]);

		const totals = transactionTotals.reduce(
			(accumulator, row) => {
				const amount = Number(row._sum.amount ?? 0);
				if (row.transactionType === "DEPOSIT") {
					accumulator.depositCount += row._count.transactionType;
					accumulator.totalDeposited += amount;
				}
				if (row.transactionType === "WITHDRAW") {
					accumulator.withdrawCount += row._count.transactionType;
					accumulator.totalWithdrawn += amount;
				}
				if (row.transactionType === "TRANSFER") {
					accumulator.transferCount += row._count.transactionType;
					accumulator.totalTransferred += amount;
				}
				return accumulator;
			},
			{
				depositCount: 0,
				withdrawCount: 0,
				transferCount: 0,
				totalDeposited: 0,
				totalWithdrawn: 0,
				totalTransferred: 0,
			},
		);

		return {
			wallet: normalizeWallet(wallet),
			summary: {
				currentBalance: wallet.balance.toString(),
				transactionCount: transactions.length,
				ledgerEntryCount: ledgerCount,
				depositCount: totals.depositCount,
				withdrawCount: totals.withdrawCount,
				transferCount: totals.transferCount,
				totalDeposited: totals.totalDeposited.toFixed(2),
				totalWithdrawn: totals.totalWithdrawn.toFixed(2),
				totalTransferred: totals.totalTransferred.toFixed(2),
			},
			recentTransactions: transactions.slice(0, 5).map(normalizeTransaction),
			recentLedgerEntries: ledgerEntries.slice(0, 10).map(normalizeLedgerEntry),
		};
	},
};
