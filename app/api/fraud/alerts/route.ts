import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { fraudService } from "@/backend/services/fraud.service";

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

		const alerts = await fraudService.listUserFraudAlerts(user.id);
		return new Response(JSON.stringify({ fraudAlerts: alerts }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch fraud alerts" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
