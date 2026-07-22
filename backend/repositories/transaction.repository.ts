import { prisma } from "@/backend/prisma/prisma";

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
};

