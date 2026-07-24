import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { currencyService } from "@/backend/services/currency.service";
import { HttpError } from "@/backend/utils/http-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = await request.json();
		const result = await currencyService.convertCurrency(user.id, {
			fromCurrency: body.fromCurrency,
			toCurrency: body.toCurrency,
			amount: Number(body.amount),
		});

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		if (error instanceof HttpError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: error.status,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : "Currency conversion failed" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
