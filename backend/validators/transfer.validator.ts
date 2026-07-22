import { z } from "zod";

export const moneyAmountSchema = z.object({
	amount: z.number().positive(),
	description: z.string().min(1).max(255).optional(),
	idempotencyKey: z.string().min(8).max(128),
});

export const depositSchema = moneyAmountSchema;

export const withdrawSchema = moneyAmountSchema;

export const transferSchema = moneyAmountSchema.extend({
	receiverAccountNumber: z.string().min(6).max(64),
});

export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type TransferInput = z.infer<typeof transferSchema>;

