import { ScheduledFrequency } from "@prisma/client";
import { prisma } from "@/backend/prisma/prisma";
import { transactionService } from "@/backend/services/transaction.service";
import { logger } from "@/backend/utils/logger";

function computeNextRunDate(currentDate: Date, frequency: ScheduledFrequency): Date | null {
	if (frequency === ScheduledFrequency.ONCE) return null;

	const next = new Date(currentDate);
	if (frequency === ScheduledFrequency.DAILY) {
		next.setDate(next.getDate() + 1);
	} else if (frequency === ScheduledFrequency.WEEKLY) {
		next.setDate(next.getDate() + 7);
	} else if (frequency === ScheduledFrequency.MONTHLY) {
		next.setMonth(next.getMonth() + 1);
	}
	return next;
}

export const scheduledPaymentService = {
	async createScheduledPayment(
		userId: string,
		input: {
			receiverAccountNumber: string;
			amount: number;
			frequency: ScheduledFrequency;
			startDate?: string;
		},
	) {
		const wallet = await prisma.wallet.findUnique({ where: { userId } });
		if (!wallet) {
			throw new Error("Wallet not found");
		}

		const nextRunAt = input.startDate ? new Date(input.startDate) : new Date();

		return prisma.scheduledPayment.create({
			data: {
				userId,
				senderWalletId: wallet.id,
				receiverAccountNumber: input.receiverAccountNumber,
				amount: input.amount,
				frequency: input.frequency,
				nextRunAt,
				status: "ACTIVE",
			},
		});
	},

	async listUserScheduledPayments(userId: string) {
		return prisma.scheduledPayment.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		});
	},

	// Crash Recovery: Worker reloads all ACTIVE due scheduled jobs from DB
	async processDueScheduledPayments() {
		const duePayments = await prisma.scheduledPayment.findMany({
			where: {
				status: "ACTIVE",
				nextRunAt: { lte: new Date() },
			},
			take: 20,
		});

		if (duePayments.length === 0) return 0;

		let processedCount = 0;
		for (const payment of duePayments) {
			try {
				const idempotencyKey = `sched-${payment.id}-${payment.nextRunAt.getTime()}`;

				await transactionService.transfer(payment.userId, {
					amount: Number(payment.amount.toString()),
					receiverAccountNumber: payment.receiverAccountNumber,
					idempotencyKey,
					description: `Automated Scheduled Payment (${payment.frequency})`,
				});

				const nextRun = computeNextRunDate(payment.nextRunAt, payment.frequency);
				if (nextRun) {
					await prisma.scheduledPayment.update({
						where: { id: payment.id },
						data: { nextRunAt: nextRun },
					});
				} else {
					await prisma.scheduledPayment.update({
						where: { id: payment.id },
						data: { status: "COMPLETED" },
					});
				}

				processedCount += 1;
			} catch (err) {
				logger.error(`[Scheduled Payment] Failed executing payment ${payment.id}:`, {
					error: err instanceof Error ? err.message : String(err),
				});

				// Pause failing payment to avoid infinite fail loops
				await prisma.scheduledPayment.update({
					where: { id: payment.id },
					data: { status: "PAUSED" },
				});
			}
		}

		return processedCount;
	},
};
