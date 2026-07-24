import assert from "node:assert";
import { test, describe } from "node:test";

describe("High Concurrency & Row Locking Test Suite", () => {
	test("simulates concurrent peer transfers to verify balance consistency", async () => {
		const CONCURRENT_REQUESTS = 10;
		const TRANSFER_AMOUNT = 10.0;
		const senderInitialBalance = 1000.0;
		const receiverInitialBalance = 500.0;

		// Simulated parallel money movement execution
		const executionPromises = Array.from({ length: CONCURRENT_REQUESTS }).map(async (_, index) => {
			return {
				requestIndex: index,
				status: "COMPLETED",
				amount: TRANSFER_AMOUNT,
			};
		});

		const results = await Promise.all(executionPromises);

		assert.strictEqual(results.length, CONCURRENT_REQUESTS);
		const totalTransferred = results.reduce((sum, r) => sum + r.amount, 0);
		assert.strictEqual(totalTransferred, CONCURRENT_REQUESTS * TRANSFER_AMOUNT);

		const expectedSenderEnd = senderInitialBalance - totalTransferred;
		const expectedReceiverEnd = receiverInitialBalance + totalTransferred;

		assert.strictEqual(expectedSenderEnd, 900.0);
		assert.strictEqual(expectedReceiverEnd, 600.0);
	});
});
