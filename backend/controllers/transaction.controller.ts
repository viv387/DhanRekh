import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { transactionService } from "@/backend/services/transaction.service";
import { HttpError } from "@/backend/utils/http-error";
import {
	depositSchema,
	transferSchema,
	withdrawSchema,
} from "@/backend/validators/transfer.validator";

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

function getIdempotencyKey(request: Request, bodyKey: string | undefined) {
	return request.headers.get("idempotency-key") ?? bodyKey ?? "";
}

export async function handleDeposit(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const body = await request.json();
		const parsed = depositSchema.parse({
			...body,
			idempotencyKey: getIdempotencyKey(request, body.idempotencyKey),
		});
		const result = await transactionService.deposit(user.id, parsed);
		return jsonResponse(201, result);
	} catch (error) {
		return mapError(error);
	}
}

export async function handleWithdraw(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const body = await request.json();
		const parsed = withdrawSchema.parse({
			...body,
			idempotencyKey: getIdempotencyKey(request, body.idempotencyKey),
		});
		const result = await transactionService.withdraw(user.id, parsed);
		return jsonResponse(201, result);
	} catch (error) {
		return mapError(error);
	}
}

export async function handleTransfer(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const body = await request.json();
		const parsed = transferSchema.parse({
			...body,
			idempotencyKey: getIdempotencyKey(request, body.idempotencyKey),
		});
		const result = await transactionService.transfer(user.id, parsed);
		return jsonResponse(201, result);
	} catch (error) {
		return mapError(error);
	}
}

export async function handleTransactionsList(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const transactions = await transactionService.listTransactionsForUser(user.id);
		return jsonResponse(200, { transactions });
	} catch (error) {
		return mapError(error);
	}
}

