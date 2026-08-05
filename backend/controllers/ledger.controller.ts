import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { transactionService } from "@/backend/services/transaction.service";
import { jsonResponse, mapError } from "@/backend/controllers/shared";


export async function handleLedgerList(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const ledger = await transactionService.listLedgerForUser(user.id);
		return jsonResponse(200, { ledger });
	} catch (error) {
		return mapError(error);
	}
}

