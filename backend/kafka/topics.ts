export const kafkaTopics = {
	transfers: "money-ledger.transfers",
	deposits: "money-ledger.deposits",
	withdrawals: "money-ledger.withdrawals",
} as const;

export type KafkaTopic = (typeof kafkaTopics)[keyof typeof kafkaTopics];
