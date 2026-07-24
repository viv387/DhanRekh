type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = {
	requestId?: string;
	transactionId?: string;
	userId?: string;
	durationMs?: number;
	[key: string]: unknown;
};

function formatLog(level: LogLevel, message: string, context?: LogContext) {
	return JSON.stringify({
		timestamp: new Date().toISOString(),
		level,
		message,
		...context,
	});
}

export const logger = {
	info(message: string, context?: LogContext) {
		console.log(formatLog("info", message, context));
	},
	warn(message: string, context?: LogContext) {
		console.warn(formatLog("warn", message, context));
	},
	error(message: string, context?: LogContext) {
		console.error(formatLog("error", message, context));
	},
	debug(message: string, context?: LogContext) {
		if (process.env.NODE_ENV !== "production") {
			console.debug(formatLog("debug", message, context));
		}
	},
};
