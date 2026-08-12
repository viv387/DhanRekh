import { z } from "zod";

export const signupSchema = z.object({
	username: z.string().min(3).max(32),
	email: z.string().email(),
	phone: z.string().min(7).max(20),
	password: z.string().min(8).max(128),
	// User-chosen account number: 4-20 alphanumeric characters, will be stored uppercase
	accountNumber: z
		.string()
		.min(4, "Account number must be at least 4 characters")
		.max(20, "Account number must be at most 20 characters")
		.regex(/^[a-zA-Z0-9]+$/, "Account number must contain only letters and numbers (no spaces or special characters)")
		.transform((val) => val.toUpperCase()),
});

export const loginSchema = z.object({
	identifier: z.string().min(3),
	password: z.string().min(8).max(128),
	// Optional 6-digit OTP for 2FA-enabled accounts
	otpToken: z.string().length(6).optional(),
});

export const tokenSchema = z.object({
	refreshToken: z.string().min(20),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;

