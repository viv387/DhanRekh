import { startAnalyticsWorker } from "./analytics.worker";
import { startAuditWorker } from "./audit.worker";
import { startEmailWorker } from "./email.worker";
import { startNotificationWorker } from "./notification.worker";
import { startOutboxRelayWorker } from "./outbox-relay.worker";
import { startSchedulerWorker } from "./scheduler.worker";

async function startAllWorkers() {
	console.log("[Worker Supervisor] Initializing Kafka consumer workers, Outbox relay, and Payment Scheduler...");

	try {
		const [analyticsConsumer, auditConsumer, emailConsumer, notificationConsumer, outboxRelay, schedulerWorker] =
			await Promise.all([
				startAnalyticsWorker(),
				startAuditWorker(),
				startEmailWorker(),
				startNotificationWorker(),
				startOutboxRelayWorker(),
				startSchedulerWorker(),
			]);

		console.log("[Worker Supervisor] All workers started successfully:");
		console.log(`  - Analytics Worker: ${analyticsConsumer ? "Active" : "Disabled (No Brokers)"}`);
		console.log(`  - Audit Worker:     ${auditConsumer ? "Active" : "Disabled (No Brokers)"}`);
		console.log(`  - Email Worker:     ${emailConsumer ? "Active" : "Disabled (No Brokers)"}`);
		console.log(`  - Notification Wkr: ${notificationConsumer ? "Active" : "Disabled (No Brokers)"}`);
		console.log(`  - Outbox Relay:     ${outboxRelay ? "Active" : "Disabled"}`);
		console.log(`  - Scheduler Worker: ${schedulerWorker ? "Active" : "Disabled"}`);

		const shutdown = async () => {
			console.log("[Worker Supervisor] Shutting down workers gracefully...");
			outboxRelay?.stop();
			schedulerWorker?.stop();
			await Promise.all([
				analyticsConsumer?.disconnect(),
				auditConsumer?.disconnect(),
				emailConsumer?.disconnect(),
				notificationConsumer?.disconnect(),
			]);
			process.exit(0);
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);
	} catch (error) {
		console.error("[Worker Supervisor] Error starting worker consumers:", error);
	}
}

if (require.main === module) {
	startAllWorkers();
}

export { startAllWorkers };
