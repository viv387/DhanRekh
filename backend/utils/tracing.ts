import { randomUUID } from "node:crypto";

export function generateCorrelationId() {
	return `corr-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export function extractCorrelationId(headers: Headers | Record<string, string | string[] | undefined>) {
	if (headers instanceof Headers) {
		return headers.get("x-correlation-id") ?? headers.get("x-request-id") ?? generateCorrelationId();
	}
	const val = headers["x-correlation-id"] ?? headers["x-request-id"];
	if (Array.isArray(val)) return val[0] ?? generateCorrelationId();
	return val ?? generateCorrelationId();
}
