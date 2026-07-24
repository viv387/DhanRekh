import { OutboxStatus } from "@prisma/client";
import { prisma } from "@/backend/prisma/prisma";
import { publishKafkaEvent } from "@/backend/kafka/producer";
import { logger } from "@/backend/utils/logger";

export const outboxService = {
	async createOutboxEntry(
		tx: any,
		data: {
			aggregateType: string;
			aggregateId: string;
			eventType: string;
			payload: unknown;
		},
	) {
		const client = tx ?? prisma;
		return client.outbox.create({
			data: {
				aggregateType: data.aggregateType,
				aggregateId: data.aggregateId,
				eventType: data.eventType,
				payload: JSON.stringify(data.payload),
				status: OutboxStatus.PENDING,
			},
		});
	},

	async processPendingOutboxEntries(limit = 50) {
		const pendingEntries = await prisma.outbox.findMany({
			where: {
				status: { in: [OutboxStatus.PENDING, OutboxStatus.RETRYING] },
			},
			take: limit,
			orderBy: { createdAt: "asc" },
		});

		if (pendingEntries.length === 0) return 0;

		let processed = 0;
		for (const entry of pendingEntries) {
			try {
				await prisma.outbox.update({
					where: { id: entry.id },
					data: { status: OutboxStatus.RETRYING, retryCount: { increment: 1 } },
				});

				const payload = JSON.parse(entry.payload);
				const topic = entry.eventType.split(".")[0] as "deposits" | "withdrawals" | "transfers";

				await publishKafkaEvent(topic in { deposits: 1, withdrawals: 1, transfers: 1 } ? topic : "transfers", payload);

				await prisma.outbox.update({
					where: { id: entry.id },
					data: {
						status: OutboxStatus.PUBLISHED,
						processedAt: new Date(),
					},
				});
				processed += 1;
			} catch (err) {
				logger.error(`[Outbox] Failed to publish outbox entry ${entry.id}:`, {
					error: err instanceof Error ? err.message : String(err),
				});

				if (entry.retryCount >= 5) {
					await prisma.outbox.update({
						where: { id: entry.id },
						data: { status: OutboxStatus.FAILED },
					});
				}
			}
		}

		return processed;
	},
};
