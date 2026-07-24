import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { scheduledPaymentService } from "@/backend/services/scheduled-payment.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const payments = await scheduledPaymentService.listUserScheduledPayments(user.id);
		return new Response(JSON.stringify({ scheduledPayments: payments }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch scheduled payments" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

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
		const payment = await scheduledPaymentService.createScheduledPayment(user.id, {
			receiverAccountNumber: body.receiverAccountNumber,
			amount: Number(body.amount),
			frequency: body.frequency ?? "ONCE",
			startDate: body.startDate,
		});

		return new Response(JSON.stringify({ scheduledPayment: payment }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : "Failed to schedule payment" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
