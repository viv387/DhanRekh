import { createKafkaConsumer } from "@/backend/kafka/consumer";
import { emailService } from "@/backend/services/email.service";

export async function startEmailWorker() {
	const consumer = await createKafkaConsumer("email-worker");
	if (!consumer) {
		return null;
	}

	await consumer.run({
		eachMessage: async ({ message }) => {
			const rawMessage = message.value?.toString() ?? "";
			await emailService.handleKafkaEvent(rawMessage);
		},
	});

	return consumer;
}