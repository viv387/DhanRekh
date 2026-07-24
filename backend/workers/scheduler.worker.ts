import { scheduledPaymentService } from "@/backend/services/scheduled-payment.service";
import { logger } from "@/backend/utils/logger";

let isRunning = false;

export async function startSchedulerWorker() {
	if (isRunning) return;
	isRunning = true;
	logger.info("[Scheduler Worker] Started crash-resilient background payment loop...");

	// Immediately execute due DB jobs upon process startup (Crash Recovery)
	scheduledPaymentService.processDueScheduledPayments().catch((err) => {
		logger.error("[Scheduler Worker] Initial startup reload error:", {
			error: err instanceof Error ? err.message : String(err),
		});
	});

	const interval = setInterval(async () => {
		try {
			const count = await scheduledPaymentService.processDueScheduledPayments();
			if (count > 0) {
				logger.info(`[Scheduler Worker] Executed ${count} scheduled payments.`);
			}
		} catch (error) {
			logger.error("[Scheduler Worker] Loop error:", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}, 10000);

	return {
		stop: () => {
			clearInterval(interval);
			isRunning = false;
		},
	};
}
