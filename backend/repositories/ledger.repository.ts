import { prisma } from "@/backend/prisma/prisma";

export const ledgerRepository = {
	listForWallet(walletId: string) {
		return prisma.ledger.findMany({
			where: { walletId },
			include: {
				transaction: true,
				wallet: true,
			},
			orderBy: { createdAt: "desc" },
		});
	},
};

