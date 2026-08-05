import { walletService } from "@/backend/services/wallet.service";
import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { jsonResponse, mapError } from "@/backend/controllers/shared";


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
