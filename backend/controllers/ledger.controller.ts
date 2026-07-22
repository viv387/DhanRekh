import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { transactionService } from "@/backend/services/transaction.service";
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

