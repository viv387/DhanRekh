const toNumber = (value: string | undefined, fallback: number) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

export const authEnv = {
	accessTokenSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
	refreshTokenSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
	accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
	refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
	bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 10),
	isProduction: process.env.NODE_ENV === "production",
	redisUrl: process.env.REDIS_URL ?? "",
	kafkaBrokers: (process.env.KAFKA_BROKERS ?? "").split(",").map((broker) => broker.trim()).filter(Boolean),
	kafkaClientId: process.env.KAFKA_CLIENT_ID ?? "money-ledger",
	rateLimitWindowSeconds: toNumber(process.env.RATE_LIMIT_WINDOW_SECONDS, 60),
	transferRateLimit: toNumber(process.env.TRANSFER_RATE_LIMIT, 5),
	moneyMovementRateLimit: toNumber(process.env.MONEY_MOVEMENT_RATE_LIMIT, 30),
	mailFrom: process.env.MAIL_FROM ?? "Money Ledger <no-reply@money-ledger.local>",
	mailHost: process.env.SMTP_HOST ?? "",
	mailPort: toNumber(process.env.SMTP_PORT, 587),
	mailUser: process.env.SMTP_USER ?? "",
	mailPassword: process.env.SMTP_PASSWORD ?? "",
	mailSecure: process.env.SMTP_SECURE === "true",
};

