import { prisma } from "@/backend/prisma/prisma";
import { publishKafkaEvent } from "@/backend/kafka/producer";
import { logger } from "@/backend/utils/logger";

export const dlqService = {
	async recordFailure(data: {
		topic: string;
		consumerGroup: string;
		payload: unknown;
		errorReason: string;
	}) {
		logger.error(`[DLQ] Recording failed message from topic ${data.topic} (${data.consumerGroup}):`, {
			reason: data.errorReason,
		});

		return prisma.deadLetterMessage.create({
			data: {
				topic: data.topic,
				consumerGroup: data.consumerGroup,
				payload: JSON.stringify(data.payload),
				errorReason: data.errorReason,
				status: "FAILED",
			},
		});
	},

	async replayMessage(dlqId: string) {
		const msg = await prisma.deadLetterMessage.findUnique({
			where: { id: dlqId },
		});

		if (!msg) {
			throw new Error("DLQ message not found");
		}

		const payload = JSON.parse(msg.payload);
		const topicKey = msg.topic as "deposits" | "withdrawals" | "transfers";

		await publishKafkaEvent(topicKey in { deposits: 1, withdrawals: 1, transfers: 1 } ? topicKey : "transfers", payload);

		return prisma.deadLetterMessage.update({
			where: { id: dlqId },
			data: {
				status: "REPLAYED",
				replayedAt: new Date(),
			},
		});
	},

	async listFailedMessages(limit = 50) {
		return prisma.deadLetterMessage.findMany({
			where: { status: "FAILED" },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	},
};
