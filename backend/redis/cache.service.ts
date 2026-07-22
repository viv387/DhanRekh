import { getRedisClient } from "@/backend/redis/redis";

export const cacheService = {
	async getValue(key: string) {
		const client = await getRedisClient();
		if (!client) {
			return null;
		}

		return client.get(key);
	},

	async setValue(key: string, value: string, ttlSeconds?: number) {
		const client = await getRedisClient();
		if (!client) {
			return;
		}

		if (ttlSeconds) {
			await client.set(key, value, { EX: ttlSeconds });
			return;
		}

		await client.set(key, value);
	},

	async deleteKey(key: string) {
		const client = await getRedisClient();
		if (!client) {
			return;
		}

		await client.del(key);
	},

	async incrementValue(key: string) {
		const client = await getRedisClient();
		if (!client) {
			return null;
		}

		return client.incr(key);
	},

	async setExpiry(key: string, ttlSeconds: number) {
		const client = await getRedisClient();
		if (!client) {
			return;
		}

		await client.expire(key, ttlSeconds);
	},
};
