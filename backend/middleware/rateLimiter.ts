import { authEnv } from "@/backend/config/env";
import { cacheService } from "@/backend/redis/cache.service";
import { HttpError } from "@/backend/utils/http-error";

type RateLimitOptions = {
	limit: number;
	windowSeconds?: number;
	keyPrefix?: string;
};

function buildRateLimitKey(userId: string, action: string, keyPrefix = "rate-limit") {
	return `${keyPrefix}:${action}:${userId}`;
}

export async function enforceRateLimit(
	userId: string,
	action: string,
	options: RateLimitOptions,
) {
	const limit = options.limit;
	const windowSeconds = options.windowSeconds ?? authEnv.rateLimitWindowSeconds;
	const key = buildRateLimitKey(userId, action, options.keyPrefix);

	const current = await cacheService.incrementValue(key);
	if (current === null) {
		return {
			limit,
			remaining: limit,
			windowSeconds,
		};
	}

	if (current === 1) {
		await cacheService.setExpiry(key, windowSeconds);
	}

	if (current > limit) {
		throw new HttpError(429, "Too many requests. Please try again later.");
	}

	return {
		limit,
		remaining: Math.max(0, limit - current),
		windowSeconds,
	};
}

export async function enforceMoneyMovementRateLimit(userId: string, action: string) {
	const limit = action === "transfer" ? authEnv.transferRateLimit : authEnv.moneyMovementRateLimit;
	return enforceRateLimit(userId, action, {
		limit,
		windowSeconds: authEnv.rateLimitWindowSeconds,
		keyPrefix: "money-move",
	});
}
