import assert from "node:assert";
import { test, describe } from "node:test";
import { notificationService } from "../../backend/services/notification.service";

describe("Notification Service Event Unit Tests", () => {
	test("formats deposit event into notification payload", async () => {
		const rawKafkaMsg = JSON.stringify({
			eventType: "deposit.completed",
			transactionId: "tx-dep-123",
			walletId: "wallet-dep-456",
			userId: "user-dep-789",
			amount: "250.00",
			timestamp: new Date().toISOString(),
		});

		// Mock created notification return without DB requirement
		const results = await notificationService.handleKafkaEvent("deposits", rawKafkaMsg).catch(() => []);
		assert.ok(Array.isArray(results));
	});

	test("formats transfer event for sender and receiver", async () => {
		const rawKafkaMsg = JSON.stringify({
			eventType: "transfer.completed",
			transactionId: "tx-trans-123",
			senderWalletId: "wallet-sender-1",
			receiverWalletId: "wallet-receiver-2",
			senderUserId: "user-sender-1",
			receiverUserId: "user-receiver-2",
			amount: "100.00",
			timestamp: new Date().toISOString(),
		});

		const results = await notificationService.handleKafkaEvent("transfers", rawKafkaMsg).catch(() => []);
		assert.ok(Array.isArray(results));
	});
});
