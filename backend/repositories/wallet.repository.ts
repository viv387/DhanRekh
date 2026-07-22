import { Prisma } from "@prisma/client";

import { prisma } from "@/backend/prisma/prisma";

export const walletRepository = {
	findById(walletId: string) {
		return prisma.wallet.findUnique({ where: { id: walletId } });
	},
	createForUser(userId: string, accountNumber: string) {
		return prisma.wallet.create({
			data: {
				userId,
				accountNumber,
				balance: new Prisma.Decimal(0),
			},
		});
	},
	findByUserId(userId: string) {
		return prisma.wallet.findUnique({ where: { userId } });
	},
	findWithUserByUserId(userId: string) {
		return prisma.wallet.findUnique({
			where: { userId },
			include: { user: true },
		});
	},
};

