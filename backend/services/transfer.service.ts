import { transactionService } from "@/backend/services/transaction.service";
import type { TransferInput } from "@/backend/validators/transfer.validator";

export const transferService = {
	async executeTransfer(userId: string, input: TransferInput) {
		return transactionService.transfer(userId, input);
	},
};
