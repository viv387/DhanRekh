import { logger } from "@/backend/utils/logger";

type RetryOptions = {
	maxAttempts?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
	context?: string;
};

export async function withExponentialBackoff<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {},
): Promise<T> {
	const maxAttempts = options.maxAttempts ?? 3;
	const baseDelay = options.baseDelayMs ?? 200;
	const maxDelay = options.maxDelayMs ?? 3000;
	const ctx = options.context ?? "operation";

	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;
			if (attempt === maxAttempts) {
				logger.error(`[Backoff] ${ctx} failed after max ${maxAttempts} attempts:`, {
					error: err instanceof Error ? err.message : String(err),
				});
				break;
			}

			const exponentialDelay = Math.min(maxDelay, baseDelay * 2 ** (attempt - 1));
			const jitter = Math.floor(Math.random() * 50);
			const delay = exponentialDelay + jitter;

			logger.warn(`[Backoff] ${ctx} attempt ${attempt}/${maxAttempts} failed. Retrying in ${delay}ms...`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}
