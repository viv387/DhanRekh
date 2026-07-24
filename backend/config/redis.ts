import { authEnv } from "@/backend/config/env";

export const redisConfig = {
	url: authEnv.redisUrl,
	rateLimitWindowSeconds: authEnv.rateLimitWindowSeconds,
	moneyMovementRateLimit: authEnv.moneyMovementRateLimit,
	transferRateLimit: authEnv.transferRateLimit,
};
