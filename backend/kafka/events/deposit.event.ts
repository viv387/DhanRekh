export type DepositEvent = {
	eventType: "deposit.completed";
	transactionId: string;
	walletId: string;
	userId: string;
	amount: string;
	timestamp: string;
};
