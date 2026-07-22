import { walletService } from "@/backend/services/wallet.service";
import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { HttpError } from "@/backend/utils/http-error";

function jsonResponse(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function mapError(error: unknown) {
	if (error instanceof HttpError) {
		return jsonResponse(error.status, { error: error.message });
	}

	return jsonResponse(500, { error: "Internal server error" });
}

export async function handleGetWallet(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const wallet = await walletService.getMyWallet(user.id);
		return jsonResponse(200, { wallet });
	} catch (error) {
		return mapError(error);
	}
}

export async function handleCreateWallet(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const wallet = await walletService.createMyWallet(user.id);
		return jsonResponse(201, { wallet });
	} catch (error) {
		return mapError(error);
	}
}
