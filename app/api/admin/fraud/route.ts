import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { prisma } from "@/backend/prisma/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/fraud
 * Returns ALL fraud alerts across all users (admin-level view).
 * Includes related user info and transaction info.
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
		const status = url.searchParams.get("status") ?? undefined;
		const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);

		const alerts = await prisma.fraudAlert.findMany({
			where: status ? { status } : undefined,
			orderBy: { createdAt: "desc" },
			take: limit,
			include: {
				user: {
					select: { id: true, username: true, email: true },
				},
				transaction: {
					select: { id: true, amount: true, transactionType: true, status: true },
				},
			},
		});

		const summary = await prisma.fraudAlert.groupBy({
			by: ["status"],
			_count: { _all: true },
		});

		return new Response(
			JSON.stringify({
				alerts: alerts.map((a) => ({
					...a,
					amount: a.transaction?.amount?.toString() ?? null,
					reasons: (() => {
						try { return JSON.parse(a.reasons); } catch { return [a.reasons]; }
					})(),
				})),
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
