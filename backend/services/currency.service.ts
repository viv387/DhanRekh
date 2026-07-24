import { prisma } from "@/backend/prisma/prisma";
import { exchangeRateCircuitBreaker } from "@/backend/utils/circuit-breaker";
import { HttpError } from "@/backend/utils/http-error";

// 1. Abstract Exchange Rate Provider Interface
export interface ExchangeRateProvider {
	getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number>;
}

// Primary Mock/Live Provider
export class OpenExchangeRatesProvider implements ExchangeRateProvider {
	private readonly rates: Record<string, number> = {
		USD: 1.0,
		EUR: 0.92,
		GBP: 0.79,
		INR: 83.5,
		JPY: 155.0,
	};

	async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
		if (fromCurrency === toCurrency) return 1.0;

		const fromRate = this.rates[fromCurrency];
		const toRate = this.rates[toCurrency];

		if (!fromRate || !toRate) {
			throw new Error(`Unsupported exchange currency pair ${fromCurrency} -> ${toCurrency}`);
		}

		return toRate / fromRate;
	}
}

// Fallback Provider when primary provider is unavailable
export class FallbackExchangeRateProvider implements ExchangeRateProvider {
	private readonly fallbackRates: Record<string, number> = {
		USD: 1.0,
		EUR: 0.91,
		GBP: 0.78,
		INR: 83.0,
		JPY: 150.0,
	};

	async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
		if (fromCurrency === toCurrency) return 1.0;
		const fromRate = this.fallbackRates[fromCurrency] ?? 1.0;
		const toRate = this.fallbackRates[toCurrency] ?? 1.0;
		return toRate / fromRate;
	}
}

// Composite Resilient Provider using Circuit Breaker & Fallback Provider
export class ResilientExchangeRateProvider implements ExchangeRateProvider {
	private primary = new OpenExchangeRatesProvider();
	private fallback = new FallbackExchangeRateProvider();

	async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
		return exchangeRateCircuitBreaker.execute(
			() => this.primary.getExchangeRate(fromCurrency, toCurrency),
			() => this.fallback.getExchangeRate(fromCurrency, toCurrency),
		);
	}
}

const defaultRateProvider = new ResilientExchangeRateProvider();

export const currencyService = {
	async getRate(fromCurrency: string, toCurrency: string) {
		return defaultRateProvider.getExchangeRate(fromCurrency, toCurrency);
	},

	async convertCurrency(userId: string, input: { fromCurrency: string; toCurrency: string; amount: number }) {
		if (input.amount <= 0) {
			throw new HttpError(400, "Amount must be positive");
		}

		const rate = await defaultRateProvider.getExchangeRate(input.fromCurrency, input.toCurrency);
		const convertedAmount = Number((input.amount * rate).toFixed(2));

		const wallet = await prisma.wallet.findUnique({ where: { userId } });
		if (!wallet) {
			throw new HttpError(404, "Wallet not found");
		}

		const currentBalance = Number(wallet.balance.toString());
		if (currentBalance < input.amount) {
			throw new HttpError(400, "Insufficient wallet balance for currency conversion");
		}

		return prisma.$transaction(async (tx: any) => {
			const updatedWallet = await tx.wallet.update({
				where: { id: wallet.id },
				data: {
					balance: currentBalance - input.amount + convertedAmount,
					currency: input.toCurrency,
				},
			});

			const conversion = await tx.currencyConversion.create({
				data: {
					userId,
					walletId: wallet.id,
					fromCurrency: input.fromCurrency,
					toCurrency: input.toCurrency,
					fromAmount: input.amount,
					toAmount: convertedAmount,
					rate,
				},
			});

			return {
				wallet: updatedWallet,
				conversion,
				rate,
			};
		});
	},
};
