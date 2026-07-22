import { createKafkaConsumer } from "@/backend/kafka/consumer";

export async function startAuditWorker() {
	const consumer = await createKafkaConsumer("audit-worker");
	if (!consumer) {
		return null;
	}

	await consumer.run({
		eachMessage: async () => {
			// Audit sink can be attached here later.
		},
	});

	return consumer;
}
