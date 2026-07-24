import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { dlqService } from "@/backend/services/dlq.service";

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

		const { dlqId } = await request.json();
		if (!dlqId) {
			return new Response(JSON.stringify({ error: "dlqId is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const result = await dlqService.replayMessage(dlqId);
		return new Response(JSON.stringify({ success: true, replayed: result }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : "Replay failed" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const messages = await dlqService.listFailedMessages();
		return new Response(JSON.stringify({ messages }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : "Failed to list DLQ messages" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
