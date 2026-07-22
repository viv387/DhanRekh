import { prisma } from "@/backend/prisma/prisma";
import { ledgerRepository } from "@/backend/repositories/ledger.repository";
import { transactionRepository } from "@/backend/repositories/transaction.repository";
import { walletRepository } from "@/backend/repositories/wallet.repository";
import { balanceCache } from "@/backend/redis/balance.cache";
import { publishKafkaEvent } from "@/backend/kafka/producer";
import { HttpError } from "@/backend/utils/http-error";
import type {
	DepositInput,
	TransferInput,
	WithdrawInput,
} from "@/backend/validators/transfer.validator";

type MoneyValue = string | number;

type TransactionClient = typeof prisma extends {
	$transaction<R>(fn: (client: infer Client) => Promise<R>, options?: unknown): Promise<R>;
} ? Client : never;

function toMoneyNumber(value: MoneyValue) {
	return Number(Number(value).toFixed(2));
}

function toMoneyString(value: MoneyValue) {
	return toMoneyNumber(value).toFixed(2);
}

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

function normalizeTransactionWithWallets(transaction: {
	id: string;
	senderWalletId: string | null;
	receiverWalletId: string | null;
	amount: { toString: () => string };
	transactionType: string;
	status: string;
	description: string | null;
	createdAt: Date;
	senderWallet?: {
		id: string;
		userId: string;
		accountNumber: string;
		balance: { toString: () => string };
		currency: string;
		status: string;
		createdAt: Date;
	} | null;
	receiverWallet?: {
		id: string;
		userId: string;
		accountNumber: string;
		balance: { toString: () => string };
		currency: string;
		status: string;
		createdAt: Date;
	} | null;
	ledgerEntries?: Array<Parameters<typeof normalizeLedgerEntry>[0]>;
}) {
	return {
		...normalizeTransaction(transaction),
		senderWallet: transaction.senderWallet ? normalizeWallet(transaction.senderWallet) : null,
		receiverWallet: transaction.receiverWallet ? normalizeWallet(transaction.receiverWallet) : null,
	};
}

async function getIdempotentTransaction(idempotencyKey: string) {
	const existing = await transactionRepository.findByIdempotencyKey(idempotencyKey);

	if (!existing?.transaction) {
		return null;
	}

	return normalizeTransaction(existing.transaction);
}

async function getMyWalletOrThrow(userId: string) {
	const wallet = await walletRepository.findByUserId(userId);

	if (!wallet) {
		throw new HttpError(404, "Wallet not found");
	}

	return wallet;
}

type WalletRow = {
	id: string;
	userId: string;
	accountNumber: string;
	balance: { toString: () => string };
	currency: string;
	status: string;
	createdAt: Date;
};

async function lockWalletForUser(tx: TransactionClient, userId: string) {
	const rows = await tx.$queryRawUnsafe<WalletRow[]>(
		`SELECT id, user_id AS "userId", account_number AS "accountNumber", balance, currency, status, created_at AS "createdAt"
		 FROM "wallets"
		 WHERE user_id = $1
		 FOR UPDATE`,
		userId,
	);

	return rows[0] ?? null;
}

async function lockWalletPair(
	tx: TransactionClient,
	senderUserId: string,
	receiverAccountNumber: string,
) {
	const rows = await tx.$queryRawUnsafe<WalletRow[]>(
		`SELECT id, user_id AS "userId", account_number AS "accountNumber", balance, currency, status, created_at AS "createdAt"
		 FROM "wallets"
		 WHERE user_id = $1 OR account_number = $2
		 ORDER BY id ASC
		 FOR UPDATE`,
		senderUserId,
		receiverAccountNumber,
	);

	const senderWallet = rows.find((wallet) => wallet.userId === senderUserId) ?? null;
	const receiverWallet = rows.find((wallet) => wallet.accountNumber === receiverAccountNumber) ?? null;

	return { senderWallet, receiverWallet };
}

function requirePositiveAmount(amount: number) {
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new HttpError(400, "Amount must be greater than zero");
	}
}

async function createLedgerRow(tx: TransactionClient, data: {
	transactionId: string;
	walletId: string;
	entryType: "DEBIT" | "CREDIT";
	amount: number;
	balanceBefore: number;
	balanceAfter: number;
}) {
	return tx.ledger.create({
		data: {
			transactionId: data.transactionId,
			walletId: data.walletId,
			entryType: data.entryType,
			amount: toMoneyString(data.amount),
			balanceBefore: toMoneyString(data.balanceBefore),
			balanceAfter: toMoneyString(data.balanceAfter),
		},
	});
}

export const transactionService = {
	async deposit(userId: string, input: DepositInput) {
		requirePositiveAmount(input.amount);

		const cached = await getIdempotentTransaction(input.idempotencyKey);
		if (cached) {
			return cached;
		}

		const result = await prisma.$transaction(async (tx: TransactionClient) => {
			const wallet = await lockWalletForUser(tx, userId);

			if (!wallet) {
				throw new HttpError(404, "Wallet not found");
			}

			const amount = toMoneyNumber(input.amount);
			const balanceBefore = toMoneyNumber(wallet.balance.toString());
			const balanceAfter = toMoneyNumber(balanceBefore + amount);

			const updatedWallet = await tx.wallet.update({
				where: { id: wallet.id },
				data: { balance: balanceAfter },
			});

			const transaction = await tx.transaction.create({
				data: {
					senderWalletId: null,
					receiverWalletId: wallet.id,
					amount,
					transactionType: "DEPOSIT",
					status: "COMPLETED",
					description: input.description ?? null,
				},
			});

			const ledgerEntry = await createLedgerRow(tx, {
				transactionId: transaction.id,
				walletId: wallet.id,
				entryType: "CREDIT",
				amount,
				balanceBefore,
				balanceAfter,
			});

			await tx.idempotencyKey.create({
				data: {
					userId,
					transactionId: transaction.id,
					idempotencyKey: input.idempotencyKey,
				},
			});

			return {
				wallet: normalizeWallet(updatedWallet),
				transaction: normalizeTransaction({ ...transaction, ledgerEntries: [ledgerEntry] }),
			};
		});

		await balanceCache.set(result.wallet.id, result.wallet.balance);
		await publishKafkaEvent("deposits", {
			eventType: "deposit.completed",
			transactionId: result.transaction.id,
			walletId: result.wallet.id,
			userId,
			amount: result.transaction.amount,
			timestamp: new Date().toISOString(),
		});
		return result;
	},

	async withdraw(userId: string, input: WithdrawInput) {
		requirePositiveAmount(input.amount);

		const cached = await getIdempotentTransaction(input.idempotencyKey);
		if (cached) {
			return cached;
		}

		const result = await prisma.$transaction(async (tx: TransactionClient) => {
			const wallet = await lockWalletForUser(tx, userId);

			if (!wallet) {
				throw new HttpError(404, "Wallet not found");
			}

			const amount = toMoneyNumber(input.amount);
			const balanceBefore = toMoneyNumber(wallet.balance.toString());
			if (balanceBefore < amount) {
				throw new HttpError(400, "Insufficient wallet balance");
			}
			const balanceAfter = toMoneyNumber(balanceBefore - amount);

			const updatedWallet = await tx.wallet.update({
				where: { id: wallet.id },
				data: { balance: balanceAfter },
			});

			const transaction = await tx.transaction.create({
				data: {
					senderWalletId: wallet.id,
					receiverWalletId: null,
					amount,
					transactionType: "WITHDRAW",
					status: "COMPLETED",
					description: input.description ?? null,
				},
			});

			const ledgerEntry = await createLedgerRow(tx, {
				transactionId: transaction.id,
				walletId: wallet.id,
				entryType: "DEBIT",
				amount,
				balanceBefore,
				balanceAfter,
			});

			await tx.idempotencyKey.create({
				data: {
					userId,
					transactionId: transaction.id,
					idempotencyKey: input.idempotencyKey,
				},
			});

			return {
				wallet: normalizeWallet(updatedWallet),
				transaction: normalizeTransaction({ ...transaction, ledgerEntries: [ledgerEntry] }),
			};
		});

		await balanceCache.set(result.wallet.id, result.wallet.balance);
		await publishKafkaEvent("withdrawals", {
			eventType: "withdraw.completed",
			transactionId: result.transaction.id,
			walletId: result.wallet.id,
			userId,
			amount: result.transaction.amount,
			timestamp: new Date().toISOString(),
		});
		return result;
	},

	async transfer(userId: string, input: TransferInput) {
		requirePositiveAmount(input.amount);

		const cached = await getIdempotentTransaction(input.idempotencyKey);
		if (cached) {
			return cached;
		}

		const result = await prisma.$transaction(async (tx: TransactionClient) => {
			const { senderWallet, receiverWallet } = await lockWalletPair(
				tx,
				userId,
				input.receiverAccountNumber,
			);
			if (!senderWallet) {
				throw new HttpError(404, "Wallet not found");
			}

			if (!receiverWallet) {
				throw new HttpError(404, "Receiver wallet not found");
			}

			if (receiverWallet.id === senderWallet.id) {
				throw new HttpError(400, "Cannot transfer to the same wallet");
			}

			const amount = toMoneyNumber(input.amount);
			const senderBefore = toMoneyNumber(senderWallet.balance.toString());
			if (senderBefore < amount) {
				throw new HttpError(400, "Insufficient wallet balance");
			}
			const senderAfter = toMoneyNumber(senderBefore - amount);
			const receiverBefore = toMoneyNumber(receiverWallet.balance.toString());
			const receiverAfter = toMoneyNumber(receiverBefore + amount);

			const updatedSender = await tx.wallet.update({
				where: { id: senderWallet.id },
				data: { balance: senderAfter },
			});

			const updatedReceiver = await tx.wallet.update({
				where: { id: receiverWallet.id },
				data: { balance: receiverAfter },
			});

			const transaction = await tx.transaction.create({
				data: {
					senderWalletId: senderWallet.id,
					receiverWalletId: receiverWallet.id,
					amount,
					transactionType: "TRANSFER",
					status: "COMPLETED",
					description: input.description ?? null,
				},
			});

			const senderLedger = await createLedgerRow(tx, {
				transactionId: transaction.id,
				walletId: senderWallet.id,
				entryType: "DEBIT",
				amount,
				balanceBefore: senderBefore,
				balanceAfter: senderAfter,
			});

			const receiverLedger = await createLedgerRow(tx, {
				transactionId: transaction.id,
				walletId: receiverWallet.id,
				entryType: "CREDIT",
				amount,
				balanceBefore: receiverBefore,
				balanceAfter: receiverAfter,
			});

			await tx.idempotencyKey.create({
				data: {
					userId,
					transactionId: transaction.id,
					idempotencyKey: input.idempotencyKey,
				},
			});

			return {
				senderWallet: normalizeWallet(updatedSender),
				receiverWallet: normalizeWallet(updatedReceiver),
				transaction: normalizeTransaction({
					...transaction,
					ledgerEntries: [senderLedger, receiverLedger],
				}),
			};
		});

		await balanceCache.set(result.senderWallet.id, result.senderWallet.balance);
		await balanceCache.set(result.receiverWallet.id, result.receiverWallet.balance);
		await publishKafkaEvent("transfers", {
			eventType: "transfer.completed",
			transactionId: result.transaction.id,
			senderWalletId: result.senderWallet.id,
			receiverWalletId: result.receiverWallet.id,
			senderUserId: userId,
			receiverUserId: result.receiverWallet.userId,
			amount: result.transaction.amount,
			timestamp: new Date().toISOString(),
		});
		return result;
	},

	async listTransactionsForUser(userId: string) {
		const wallet = await getMyWalletOrThrow(userId);
		const transactions = await transactionRepository.listForWallet(wallet.id);
		return transactions.map(normalizeTransactionWithWallets);
	},

	async listLedgerForUser(userId: string) {
		const wallet = await getMyWalletOrThrow(userId);
		const ledgerEntries = await ledgerRepository.listForWallet(wallet.id);
		return ledgerEntries.map((entry) => ({
			id: entry.id,
			transactionId: entry.transactionId,
			walletId: entry.walletId,
			entryType: entry.entryType,
			amount: entry.amount.toString(),
			balanceBefore: entry.balanceBefore.toString(),
			balanceAfter: entry.balanceAfter.toString(),
			createdAt: entry.createdAt,
			transaction: entry.transaction,
			wallet: normalizeWallet(entry.wallet),
		}));
	},
};
