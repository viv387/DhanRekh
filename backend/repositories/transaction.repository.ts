import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/backend/prisma/prisma";
import type { TransactionSearchInput } from "@/backend/validators/transaction.validator";

export const transactionRepository = {
	findByIdempotencyKey(idempotencyKey: string) {
		return prisma.idempotencyKey.findUnique({
			where: { idempotencyKey },
			include: {
				transaction: {
					include: {
						ledgerEntries: true,
					},
				},
			},
		});
	},

	listForWallet(walletId: string) {
		return prisma.transaction.findMany({
			where: {
				OR: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
			},
			include: {
				senderWallet: true,
				receiverWallet: true,
				ledgerEntries: true,
			},
			orderBy: { createdAt: "desc" },
		});
	},

	async findWithFilters(walletId: string, params: TransactionSearchInput) {
		const whereClause: Prisma.TransactionWhereInput = {
			AND: [
				{
					OR: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
				},
				params.type ? { transactionType: params.type as TransactionType } : {},
				params.status ? { status: params.status as TransactionStatus } : {},
				params.minAmount !== undefined || params.maxAmount !== undefined
					? {
							amount: {
								...(params.minAmount !== undefined ? { gte: params.minAmount } : {}),
								...(params.maxAmount !== undefined ? { lte: params.maxAmount } : {}),
							},
					  }
					: {},
				params.startDate || params.endDate
					? {
							createdAt: {
								...(params.startDate ? { gte: new Date(params.startDate) } : {}),
								...(params.endDate ? { lte: new Date(params.endDate) } : {}),
							},
					  }
					: {},
			],
		};

		const page = params.page ?? 1;
		const limit = params.limit ?? 10;
		const skip = (page - 1) * limit;

		const [total, transactions] = await Promise.all([
			prisma.transaction.count({ where: whereClause }),
			prisma.transaction.findMany({
				where: whereClause,
				include: {
					senderWallet: true,
					receiverWallet: true,
					ledgerEntries: true,
				},
				orderBy: {
					[params.sortBy ?? "createdAt"]: params.sortOrder ?? "desc",
				},
				skip,
				take: limit,
			}),
		]);

		return {
			transactions,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit) || 1,
			},
		};
	},
};
