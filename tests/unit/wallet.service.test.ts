import assert from "node:assert";
import { test, describe } from "node:test";
import { transactionSearchSchema } from "../../backend/validators/transaction.validator";
import { moneyAmountSchema, transferSchema } from "../../backend/validators/transfer.validator";

describe("Wallet & Transaction Validator Unit Tests", () => {
	test("validates money deposit/withdraw payload", () => {
		const valid = moneyAmountSchema.parse({
			amount: 150.5,
			description: "Unit Test Deposit",
			idempotencyKey: "idem-key-12345678",
		});
		assert.strictEqual(valid.amount, 150.5);

		assert.throws(() => {
			moneyAmountSchema.parse({ amount: -50, idempotencyKey: "idem-key-123" });
		});
	});

	test("validates peer transfer payload", () => {
		const validTransfer = transferSchema.parse({
			amount: 99.99,
			receiverAccountNumber: "ACC-999999",
			idempotencyKey: "idem-transfer-key-888",
		});
		assert.strictEqual(validTransfer.receiverAccountNumber, "ACC-999999");
	});

	test("validates transaction search and pagination parameters", () => {
		const query = transactionSearchSchema.parse({
			type: "TRANSFER",
			status: "COMPLETED",
			minAmount: "10",
			maxAmount: "500",
			page: "2",
			limit: "20",
		});

		assert.strictEqual(query.type, "TRANSFER");
		assert.strictEqual(query.page, 2);
		assert.strictEqual(query.limit, 20);
		assert.strictEqual(query.minAmount, 10);
	});
});
