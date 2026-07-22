import { prisma } from "@/backend/prisma/prisma";
import { walletRepository } from "@/backend/repositories/wallet.repository";
import { generateAccountNumber } from "@/backend/utils/accountGenerator";
import { HttpError } from "@/backend/utils/http-error";

async function createUniqueAccountNumber() {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const accountNumber = generateAccountNumber();
		const existing = await prisma.wallet.findUnique({ where: { accountNumber } });
		if (!existing) {
			return accountNumber;
		}
	}

	throw new HttpError(500, "Unable to generate wallet account number");
}

function normalizeWallet(wallet: {
	id: string;
	userId: string;
	accountNumber: string;
	balance: {
		toString: () => string;
	};
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

export const walletService = {
	async getMyWallet(userId: string) {
		const wallet = await walletRepository.findByUserId(userId);

		if (!wallet) {
			throw new HttpError(404, "Wallet not found");
		}

		return normalizeWallet(wallet);
	},

	async createMyWallet(userId: string) {
		const existingWallet = await walletRepository.findByUserId(userId);

		if (existingWallet) {
			return normalizeWallet(existingWallet);
		}

		const accountNumber = await createUniqueAccountNumber();
		const wallet = await walletRepository.createForUser(userId, accountNumber);

		return normalizeWallet(wallet);
	},
};
