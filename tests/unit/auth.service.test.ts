import assert from "node:assert";
import { test, describe } from "node:test";
import { hashPassword, comparePassword } from "../../backend/utils/bcrypt";
import { signAccessToken, verifyAccessToken } from "../../backend/utils/jwt";
import { generateAccountNumber } from "../../backend/utils/accountGenerator";

describe("Auth Unit Tests", () => {
	test("password hashing and comparison", async () => {
		const rawPassword = "SecurePassword123!";
		const hashed = await hashPassword(rawPassword);

		assert.notStrictEqual(hashed, rawPassword);
		const isValid = await comparePassword(rawPassword, hashed);
		assert.strictEqual(isValid, true);

		const isInvalid = await comparePassword("WrongPassword", hashed);
		assert.strictEqual(isInvalid, false);
	});

	test("JWT sign and verification", () => {
		const payload = {
			userId: "test-user-id-123",
			email: "unit@example.com",
			username: "unit_user",
		};

		const token = signAccessToken(payload);
		assert.ok(typeof token === "string" && token.length > 0);

		const decoded = verifyAccessToken(token);
		assert.strictEqual(decoded.userId, payload.userId);
		assert.strictEqual(decoded.email, payload.email);
	});

	test("account number format generator", () => {
		const accNum = generateAccountNumber();
		assert.ok(typeof accNum === "string");
		assert.ok(accNum.startsWith("ML"));
		assert.strictEqual(accNum.length, 12);
	});
});
