import { createKafkaConsumer } from "@/backend/kafka/consumer";

export async function startNotificationWorker() {
	const consumer = await createKafkaConsumer("notification-worker");
	if (!consumer) {
		return null;
	}

	await consumer.run({
		eachMessage: async () => {
			// Notifications can be attached here later.
		},
	});

	return consumer;
}
