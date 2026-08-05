import { Prisma } from "@prisma/client";

import { prisma } from "@/backend/prisma/prisma";
import { userRepository } from "@/backend/repositories/user.repository";
import { authEnv } from "@/backend/config/env";
import { comparePassword, hashPassword } from "@/backend/utils/bcrypt";
import { generateAccountNumber } from "@/backend/utils/accountGenerator";
import { otpService } from "@/backend/services/otp.service";
import {
	signAccessToken,
	signRefreshToken,
	verifyRefreshToken,
} from "@/backend/utils/jwt";
import { HttpError } from "@/backend/utils/http-error";
import type { LoginInput, SignupInput } from "@/backend/validators/auth.validator";

function publicUser(user: {
	id: string;
	username: string;
	email: string;
	phone: string;
	createdAt: Date;
	wallet?: unknown;
}) {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		phone: user.phone,
		createdAt: user.createdAt,
	};
}

async function createUniqueAccountNumber() {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const accountNumber = generateAccountNumber();
		const existing = await prisma.wallet.findUnique({ where: { accountNumber } });
		if (!existing) {
			return accountNumber;
		}
	}

	throw new HttpError(500, "Unable to generate wallet account number");
}

async function storeRefreshToken(userId: string, refreshToken: string, expiresAt: Date) {
	await prisma.refreshToken.create({
		data: {
			userId,
			refreshToken,
			expiresAt,
		},
	});
}

function refreshExpiryDate() {
	const duration = authEnv.refreshTokenExpiresIn;
	const match = /^([0-9]+)([smhd])$/.exec(duration);

	if (!match) {
		return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	}

	const amount = Number(match[1]);
	const unit = match[2];
	const multipliers: Record<string, number> = {
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000,
	};
	const multiplier = multipliers[unit] ?? (24 * 60 * 60 * 1000);

	return new Date(Date.now() + amount * multiplier);
}

export const authService = {
	async signup(input: SignupInput) {
		const existing = await Promise.all([
			userRepository.findByEmail(input.email),
			userRepository.findByUsername(input.username),
			userRepository.findByPhone(input.phone),
		]);

		if (existing[0]) {
			throw new HttpError(409, "Email already exists");
		}

		if (existing[1]) {
			throw new HttpError(409, "Username already exists");
		}

		if (existing[2]) {
			throw new HttpError(409, "Phone already exists");
		}

		const passwordHash = await hashPassword(input.password);
		const accountNumber = await createUniqueAccountNumber();

		const result = await prisma.$transaction(async (tx: any) => {
			const user = await tx.user.create({
				data: {
					username: input.username,
					email: input.email,
					phone: input.phone,
					passwordHash,
				},
			});

			const wallet = await tx.wallet.create({
				data: {
					userId: user.id,
					accountNumber,
					balance: new Prisma.Decimal(0),
				},
			});

			return { user, wallet };
		});

		const accessTokenPayload = {
			userId: result.user.id,
			email: result.user.email,
			username: result.user.username,
		};

		const accessToken = signAccessToken(accessTokenPayload);
		const refreshToken = signRefreshToken(accessTokenPayload);

		await storeRefreshToken(result.user.id, refreshToken, refreshExpiryDate());

		await prisma.auditLog.create({
			data: {
				userId: result.user.id,
				action: "auth.signup",
			},
		});

		return {
			user: publicUser(result.user),
			wallet: result.wallet,
			accessToken,
			refreshToken,
		};
	},

	async login(input: LoginInput) {
		const user = await prisma.user.findFirst({
			where: {
				OR: [
					{ email: input.identifier },
					{ username: input.identifier },
					{ phone: input.identifier },
				],
			},
			include: { wallet: true },
		});

		if (!user) {
			throw new HttpError(401, "Invalid credentials");
		}

		const passwordValid = await comparePassword(input.password, user.passwordHash);
		if (!passwordValid) {
			throw new HttpError(401, "Invalid credentials");
		}

		// ✅ 2FA enforcement — if enabled, require a valid OTP token
		if (user.twoFactorEnabled && user.twoFactorSecret) {
			if (!input.otpToken) {
				// Tell the frontend to show the OTP input screen
				throw new HttpError(401, JSON.stringify({
					requiresOtp: true,
					message: "Two-factor authentication required. Please enter your 6-digit OTP code.",
				}));
			}

			const otpValid = otpService.verifyCode(user.twoFactorSecret, input.otpToken);
			if (!otpValid) {
				throw new HttpError(401, "Invalid or expired OTP code.");
			}
		}

		const accessTokenPayload = {
			userId: user.id,
			email: user.email,
			username: user.username,
		};

		const accessToken = signAccessToken(accessTokenPayload);
		const refreshToken = signRefreshToken(accessTokenPayload);

		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await storeRefreshToken(user.id, refreshToken, refreshExpiryDate());

		await prisma.auditLog.create({
			data: {
				userId: user.id,
				action: "auth.login",
			},
		});

		return {
			user: publicUser(user),
			wallet: user.wallet,
			accessToken,
			refreshToken,
		};
	},

	async refresh(refreshToken: string) {
		const payload = verifyRefreshToken(refreshToken);
		const storedToken = await prisma.refreshToken.findUnique({
			where: { refreshToken },
		});

		if (!storedToken || storedToken.expiresAt.getTime() < Date.now()) {
			throw new HttpError(401, "Refresh token expired");
		}

		const user = await prisma.user.findUnique({
			where: { id: payload.userId },
			include: { wallet: true },
		});

		if (!user) {
			throw new HttpError(401, "User not found");
		}

		const accessTokenPayload = {
			userId: user.id,
			email: user.email,
			username: user.username,
		};

		const newAccessToken = signAccessToken(accessTokenPayload);
		const newRefreshToken = signRefreshToken(accessTokenPayload);

		await prisma.$transaction(async (tx: any) => {
			await tx.refreshToken.delete({ where: { refreshToken } });
			await tx.refreshToken.create({
				data: {
					userId: user.id,
					refreshToken: newRefreshToken,
					expiresAt: refreshExpiryDate(),
				},
			});
		});

		return {
			user: publicUser(user),
			wallet: user.wallet,
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		};
	},

	async logout(refreshToken: string) {
		await prisma.refreshToken.deleteMany({ where: { refreshToken } });
	},
};

