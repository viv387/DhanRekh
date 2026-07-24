import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { auditService } from "@/backend/services/audit.service";

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

		const auditLogs = await auditService.listForUser(user.id);
		return new Response(JSON.stringify({ auditLogs }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
