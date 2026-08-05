import { authService } from "@/backend/services/auth.service";
import { clearAuthCookieHeaders, buildAuthCookieHeaders } from "@/backend/utils/cookies";
import { jsonResponse, mapError } from "@/backend/controllers/shared";
import {
	loginSchema,
	signupSchema,
	tokenSchema,
} from "@/backend/validators/auth.validator";


export async function handleSignup(request: Request) {
	try {
		const payload = signupSchema.parse(await request.json());
		const result = await authService.signup(payload);

		return jsonResponse(
			201,
			{
				user: result.user,
				wallet: result.wallet,
			},
			buildAuthCookieHeaders(result.accessToken, result.refreshToken),
		);
	} catch (error) {
		return mapError(error);
	}
}

export async function handleLogin(request: Request) {
	try {
		const payload = loginSchema.parse(await request.json());
		const result = await authService.login(payload);

		return jsonResponse(
			200,
			{
				user: result.user,
				wallet: result.wallet,
			},
			buildAuthCookieHeaders(result.accessToken, result.refreshToken),
		);
	} catch (error) {
		return mapError(error);
	}
}

export async function handleRefresh(request: Request) {
	try {
		const cookieHeader = request.headers.get("cookie") ?? "";
		const tokenFromCookie = cookieHeader
			.split(";")
			.map((segment) => segment.trim())
			.find((segment) => segment.startsWith("refresh_token="))
			?.slice("refresh_token=".length);

		const parsed = tokenSchema.parse({ refreshToken: tokenFromCookie ?? "" });
		const result = await authService.refresh(parsed.refreshToken);

		return jsonResponse(
			200,
			{
				user: result.user,
				wallet: result.wallet,
			},
			buildAuthCookieHeaders(result.accessToken, result.refreshToken),
		);
	} catch (error) {
		return mapError(error);
	}
}

export async function handleLogout(request: Request) {
	try {
		const cookieHeader = request.headers.get("cookie") ?? "";
		const refreshToken = cookieHeader
			.split(";")
			.map((segment) => segment.trim())
			.find((segment) => segment.startsWith("refresh_token="))
			?.slice("refresh_token=".length);

		if (refreshToken) {
			await authService.logout(refreshToken);
		}

		return jsonResponse(200, { message: "Logged out" }, clearAuthCookieHeaders());
	} catch (error) {
		return mapError(error);
	}
}

export async function handleMe(request: Request) {
	try {
		const { getAuthenticatedUser } = await import("@/backend/middleware/auth.middleware");
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		return jsonResponse(200, { user });
	} catch (error) {
		return mapError(error);
	}
}

