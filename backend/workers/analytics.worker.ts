import { createKafkaConsumer } from "@/backend/kafka/consumer";

export async function startAnalyticsWorker() {
	const consumer = await createKafkaConsumer("analytics-worker");
	if (!consumer) {
		return null;
	}

	await consumer.run({
		eachMessage: async () => {
			// Analytics aggregation can be attached here later.
		},
	});

	return consumer;
}
