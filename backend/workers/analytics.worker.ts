import { createKafkaConsumer } from "@/backend/kafka/consumer";
import { analyticsService } from "@/backend/services/analytics.service";

export async function startAnalyticsWorker() {
	const consumer = await createKafkaConsumer("analytics-worker");
	if (!consumer) {
		return null;
	}

	await consumer.run({
		eachMessage: async ({ message }) => {
			const rawMessage = message.value?.toString() ?? "";
			if (!rawMessage) {
				return;
			}

			const event = JSON.parse(rawMessage) as {
				eventType: string;
				userId?: string;
				senderUserId?: string;
				receiverUserId?: string;
			};

			const affectedUsers = new Set<string>();
			if (event.userId) {
				affectedUsers.add(event.userId);
			}
			if (event.senderUserId) {
				affectedUsers.add(event.senderUserId);
			}
			if (event.receiverUserId) {
				affectedUsers.add(event.receiverUserId);
			}

			await Promise.all(
				Array.from(affectedUsers).map((userId) => analyticsService.refreshDashboardSummary(userId)),
			);
		},
	});

	return consumer;
}
