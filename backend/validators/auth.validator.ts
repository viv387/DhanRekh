import { z } from "zod";

export const signupSchema = z.object({
	username: z.string().min(3).max(32),
	email: z.string().email(),
	phone: z.string().min(7).max(20),
	password: z.string().min(8).max(128),
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

