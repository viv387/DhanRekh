/**
 * OTP Service — Native Crypto implementation
 * Generates 6-digit verification codes using node:crypto without external dependencies.
 */
import { randomInt } from "node:crypto";

export const otpService = {
	/**
	 * Generates a 6-digit numeric OTP code (e.g., "482910")
	 */
	generateCode(): string {
		return randomInt(100000, 999999).toString();
	},

	/**
	 * Verifies a user-entered 6-digit OTP code against the expected code.
	 */
	verifyCode(expectedCode: string, userCode: string): boolean {
		if (!expectedCode || !userCode) return false;
		return expectedCode.trim() === userCode.trim();
	},
};
