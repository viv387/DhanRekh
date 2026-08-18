import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { dlqService } from "@/backend/services/dlq.service";
import { prisma } from "@/backend/prisma/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dlq
 * Lists dead-letter queue messages with optional status filter.
 *
 * POST /api/admin/dlq
 * Replays a specific DLQ message by ID.
 * Body: { dlqId: string }
 */
export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const url = new URL(request.url);
		const status = url.searchParams.get("status") ?? "FAILED";
		const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);

		const messages = await prisma.deadLetterMessage.findMany({
			where: status === "ALL" ? undefined : { status },
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		const summary = await prisma.deadLetterMessage.groupBy({
			by: ["status"],
			_count: { _all: true },
		});

		return new Response(
			JSON.stringify({
				messages,
				summary: summary.reduce((acc, s) => {
					acc[s.status] = s._count._all;
					return acc;
				}, {} as Record<string, number>),
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }),
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
