import { createKafkaConsumer } from "@/backend/kafka/consumer";
import { notificationService } from "@/backend/services/notification.service";

export async function startNotificationWorker() {
	const consumer = await createKafkaConsumer("notification-worker");
	if (!consumer) {
		return null;
	}

	await consumer.run({
		eachMessage: async ({ topic, message }) => {
			const rawMessage = message.value?.toString() ?? "";
			await notificationService.handleKafkaEvent(topic, rawMessage);
		},
	});

	return consumer;
}
