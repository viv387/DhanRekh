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
};

