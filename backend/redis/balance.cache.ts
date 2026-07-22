import { cacheService } from "@/backend/redis/cache.service";

const balanceKey = (walletId: string) => `wallet:balance:${walletId}`;

export const balanceCache = {
	async get(walletId: string) {
		const value = await cacheService.getValue(balanceKey(walletId));
		return value;
	},

	async set(walletId: string, balance: string | number) {
		await cacheService.setValue(balanceKey(walletId), String(balance));
	},

	async clear(walletId: string) {
		await cacheService.deleteKey(balanceKey(walletId));
	},
};
