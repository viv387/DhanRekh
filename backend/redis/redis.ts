import { createClient, type RedisClientType } from "redis";

import { authEnv } from "@/backend/config/env";

let redisClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export async function getRedisClient() {
	if (!authEnv.redisUrl) {
		return null;
	}

	if (redisClient?.isOpen) {
		return redisClient;
	}

	if (!connectPromise) {
		connectPromise = (async () => {
			if (!redisClient) {
				redisClient = createClient({ url: authEnv.redisUrl });
				redisClient.on("error", () => {
					// Connection errors are handled by falling back to PostgreSQL.
				});
			}

			if (!redisClient.isOpen) {
				await redisClient.connect();
			}

			return redisClient;
		})();
	}

	try {
		return await connectPromise;
	} catch {
		redisClient = null;
		return null;
	} finally {
		connectPromise = null;
	}
}
