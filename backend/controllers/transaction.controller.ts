import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { enforceMoneyMovementRateLimit } from "@/backend/middleware/rateLimiter";
import { transactionService } from "@/backend/services/transaction.service";
import { jsonResponse, mapError } from "@/backend/controllers/shared";
import {
	depositSchema,
	transferSchema,
	withdrawSchema,
} from "@/backend/validators/transfer.validator";
import { transactionSearchSchema } from "@/backend/validators/transaction.validator";


function getIdempotencyKey(request: Request, bodyKey: string | undefined) {
	return request.headers.get("idempotency-key") ?? bodyKey ?? "";
}

export async function handleDeposit(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		await enforceMoneyMovementRateLimit(user.id, "deposit");

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

		await enforceMoneyMovementRateLimit(user.id, "withdraw");

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

		await enforceMoneyMovementRateLimit(user.id, "transfer");

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

		const { searchParams } = new URL(request.url);
		const rawParams: Record<string, string> = {};
		searchParams.forEach((value, key) => {
			if (value.trim() !== "") {
				rawParams[key] = value;
			}
		});

		const parsedParams = transactionSearchSchema.parse(rawParams);
		const result = await transactionService.searchTransactionsForUser(user.id, parsedParams);
		return jsonResponse(200, result);
	} catch (error) {
		return mapError(error);
	}
}

