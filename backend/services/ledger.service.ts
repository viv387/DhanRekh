import { ledgerRepository } from "@/backend/repositories/ledger.repository";

export const ledgerService = {
	async listForWallet(walletId: string) {
		return ledgerRepository.listForWallet(walletId);
	},
};
