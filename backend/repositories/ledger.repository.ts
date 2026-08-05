import { prisma } from "@/backend/prisma/prisma";

export const ledgerRepository = {
	listForWallet(walletId: string, options?: { take?: number; orderBy?: { createdAt: "asc" | "desc" } }) {
		return prisma.ledger.findMany({
			where: { walletId },
			include: {
				transaction: true,
				wallet: true,
			},
			orderBy: options?.orderBy ?? { createdAt: "desc" },
			...(options?.take ? { take: options.take } : {}),
		});
	},
};

