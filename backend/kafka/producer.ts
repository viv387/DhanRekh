import { Kafka, type Producer } from "kafkajs";

import { authEnv } from "@/backend/config/env";
import { kafkaTopics } from "@/backend/kafka/topics";

let producerPromise: Promise<Producer | null> | null = null;
let cachedProducer: Producer | null = null;

async function getProducer() {
	if (!authEnv.kafkaBrokers.length) {
		return null;
	}

	if (cachedProducer) {
		return cachedProducer;
	}

	if (!producerPromise) {
		producerPromise = (async () => {
			const kafka = new Kafka({
				clientId: authEnv.kafkaClientId,
				brokers: authEnv.kafkaBrokers,
			});

			const producer = kafka.producer();
			await producer.connect();
			cachedProducer = producer;
			return producer;
		})();
	}

	try {
		return await producerPromise;
	} catch {
		cachedProducer = null;
		return null;
	} finally {
		producerPromise = null;
	}
}

export async function publishKafkaEvent(topic: keyof typeof kafkaTopics, message: unknown) {
	const producer = await getProducer();
	if (!producer) {
		return;
	}

	await producer.send({
		topic: kafkaTopics[topic],
		messages: [
			{
				value: JSON.stringify(message),
			},
		],
	});
}
