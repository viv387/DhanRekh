import { prisma } from "@/backend/prisma/prisma";
import { verifyAccessToken } from "@/backend/utils/jwt";

export function parseCookieHeader(cookieHeader: string | null) {
	const cookies: Record<string, string> = {};

	if (!cookieHeader) {
		return cookies;
	}

	for (const pair of cookieHeader.split(";")) {
		const [rawKey, ...rawValue] = pair.trim().split("=");
		if (!rawKey) {
			continue;
		}

		cookies[rawKey] = decodeURIComponent(rawValue.join("="));
	}

	return cookies;
}

export async function getAuthenticatedUser(request: Request) {
	const authorization = request.headers.get("authorization");
	const cookieToken = parseCookieHeader(request.headers.get("cookie")).access_token;
	const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
	const token = bearerToken ?? cookieToken;

	if (!token) {
		return null;
	}

	const payload = verifyAccessToken(token);
	return prisma.user.findUnique({
		where: { id: payload.userId },
		include: { wallet: true },
	});
}

