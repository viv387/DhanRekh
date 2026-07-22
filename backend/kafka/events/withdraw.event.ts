export type WithdrawEvent = {
	eventType: "withdraw.completed";
	transactionId: string;
	walletId: string;
	userId: string;
	amount: string;
	timestamp: string;
};
