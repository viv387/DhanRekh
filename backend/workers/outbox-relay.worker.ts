import { outboxService } from "@/backend/services/outbox.service";
import { logger } from "@/backend/utils/logger";

let isRunning = false;

export async function startOutboxRelayWorker() {
	if (isRunning) return;
	isRunning = true;
	logger.info("[Outbox Relay Worker] Started background polling loop...");

	const interval = setInterval(async () => {
		try {
			const count = await outboxService.processPendingOutboxEntries(25);
			if (count > 0) {
				logger.info(`[Outbox Relay Worker] Processed & published ${count} outbox messages.`);
			}
		} catch (error) {
			logger.error("[Outbox Relay Worker] Loop error:", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}, 3000);

	return {
		stop: () => {
			clearInterval(interval);
			isRunning = false;
		},
	};
}
