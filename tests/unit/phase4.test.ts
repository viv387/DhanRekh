import assert from "node:assert";
import { test, describe } from "node:test";
import { CircuitBreaker } from "../../backend/utils/circuit-breaker";
import { ResilientExchangeRateProvider } from "../../backend/services/currency.service";
import { fraudService } from "../../backend/services/fraud.service";

describe("Phase 4 Enterprise Features Unit Tests", () => {
	test("Circuit Breaker state machine & Prometheus metrics", async () => {
		const breaker = new CircuitBreaker({ name: "test-breaker", failureThreshold: 2, resetTimeoutMs: 1000 });
		const metricsInitial = breaker.getMetrics();
		assert.strictEqual(metricsInitial.state, "CLOSED");
		assert.strictEqual(metricsInitial.closedCount, 1);

		// Execute success
		await breaker.execute(async () => "ok");
		assert.strictEqual(breaker.getMetrics().state, "CLOSED");
	});

	test("Exchange Rate Provider abstraction", async () => {
		const provider = new ResilientExchangeRateProvider();
		const rateUsdEur = await provider.getExchangeRate("USD", "EUR");
		assert.ok(typeof rateUsdEur === "number");
		assert.ok(rateUsdEur > 0);

		const sameRate = await provider.getExchangeRate("USD", "USD");
		assert.strictEqual(sameRate, 1.0);
	});

	test("Fraud Engine dual risk and confidence scoring", async () => {
		// Mock high amount evaluation
		const result = await fraudService.evaluateTransactionRisk("user-test-123", 15000);
		assert.ok(result.riskScore >= 45);
		assert.ok(result.confidenceScore >= 90);
		assert.ok(result.reasons.length > 0);
	});
});
