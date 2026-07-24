import { logger } from "@/backend/utils/logger";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

type CircuitBreakerOptions = {
	failureThreshold?: number;
	resetTimeoutMs?: number;
	name?: string;
};

export class CircuitBreaker {
	private state: CircuitState = "CLOSED";
	private failureCount = 0;
	private lastStateChangeTime = Date.now();
	private readonly failureThreshold: number;
	private readonly resetTimeoutMs: number;
	private readonly name: string;

	// Prometheus Metrics Tracking
	private openCount = 0;
	private halfOpenCount = 0;
	private closedCount = 1;

	constructor(options: CircuitBreakerOptions = {}) {
		this.failureThreshold = options.failureThreshold ?? 3;
		this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
		this.name = options.name ?? "default-circuit";
	}

	async execute<T>(fn: () => Promise<T>, fallbackFn?: () => Promise<T>): Promise<T> {
		this.checkState();

		if (this.state === "OPEN") {
			logger.warn(`[CircuitBreaker] ${this.name} is OPEN. Executing fallback.`);
			if (fallbackFn) {
				return fallbackFn();
			}
			throw new Error(`CircuitBreaker ${this.name} is OPEN`);
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			if (fallbackFn) {
				logger.warn(`[CircuitBreaker] ${this.name} failed attempt. Executing fallback.`);
				return fallbackFn();
			}
			throw error;
		}
	}

	private checkState() {
		if (this.state === "OPEN" && Date.now() - this.lastStateChangeTime > this.resetTimeoutMs) {
			this.transitionTo("HALF_OPEN");
		}
	}

	private onSuccess() {
		if (this.state === "HALF_OPEN" || this.failureCount > 0) {
			this.failureCount = 0;
			this.transitionTo("CLOSED");
		}
	}

	private onFailure() {
		this.failureCount += 1;
		logger.warn(`[CircuitBreaker] ${this.name} failure count: ${this.failureCount}/${this.failureThreshold}`);
		if (this.failureCount >= this.failureThreshold) {
			this.transitionTo("OPEN");
		}
	}

	private transitionTo(newState: CircuitState) {
		if (this.state === newState) return;
		logger.info(`[CircuitBreaker] ${this.name} state changed: ${this.state} -> ${newState}`);
		this.state = newState;
		this.lastStateChangeTime = Date.now();

		if (newState === "OPEN") this.openCount += 1;
		if (newState === "HALF_OPEN") this.halfOpenCount += 1;
		if (newState === "CLOSED") this.closedCount += 1;
	}

	public getMetrics() {
		return {
			name: this.name,
			state: this.state,
			failureCount: this.failureCount,
			openCount: this.openCount,
			halfOpenCount: this.halfOpenCount,
			closedCount: this.closedCount,
		};
	}
}

export const emailCircuitBreaker = new CircuitBreaker({
	name: "email-service-breaker",
	failureThreshold: 3,
	resetTimeoutMs: 15000,
});

export const exchangeRateCircuitBreaker = new CircuitBreaker({
	name: "exchange-rate-breaker",
	failureThreshold: 2,
	resetTimeoutMs: 10000,
});
