export type TransferEvent = {
	eventType: "transfer.completed";
	transactionId: string;
	senderWalletId: string;
	receiverWalletId: string;
	senderUserId: string;
	receiverUserId: string;
	amount: string;
	timestamp: string;
};
