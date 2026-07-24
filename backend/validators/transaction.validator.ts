import { z } from "zod";

export const transactionSearchSchema = z.object({
	type: z.enum(["DEPOSIT", "WITHDRAW", "TRANSFER"]).optional(),
	status: z.enum(["PENDING", "COMPLETED", "FAILED", "REVERSED"]).optional(),
	startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
	endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
	minAmount: z.coerce.number().min(0).optional(),
	maxAmount: z.coerce.number().min(0).optional(),
	sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10),
});

export type TransactionSearchInput = z.infer<typeof transactionSearchSchema>;
