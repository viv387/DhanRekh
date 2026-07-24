import { authEnv } from "@/backend/config/env";
import { kafkaTopics } from "@/backend/kafka/topics";

export const kafkaConfig = {
	clientId: authEnv.kafkaClientId,
	brokers: authEnv.kafkaBrokers,
	topics: kafkaTopics,
};
