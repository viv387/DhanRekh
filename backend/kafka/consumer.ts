import { Kafka } from "kafkajs";

import { authEnv } from "@/backend/config/env";
import { kafkaTopics } from "@/backend/kafka/topics";

export async function createKafkaConsumer(groupId: string) {
	if (!authEnv.kafkaBrokers.length) {
		return null;
	}

	const kafka = new Kafka({
		clientId: `${authEnv.kafkaClientId}-${groupId}`,
		brokers: authEnv.kafkaBrokers,
	});

	const consumer = kafka.consumer({ groupId });
	await consumer.connect();
	await consumer.subscribe({ topic: kafkaTopics.transfers, fromBeginning: false });
	await consumer.subscribe({ topic: kafkaTopics.deposits, fromBeginning: false });
	await consumer.subscribe({ topic: kafkaTopics.withdrawals, fromBeginning: false });

	return consumer;
}
