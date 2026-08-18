import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { prisma } from "@/backend/prisma/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/fraud/[id]/resolve
 * Marks a fraud alert as RESOLVED or DISMISSED.
 */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { id } = await params;
		const body = await request.json();
		const newStatus: string = body.status ?? "RESOLVED";

		const updated = await prisma.fraudAlert.update({
			where: { id },
			data: { status: newStatus },
		});

		return new Response(JSON.stringify({ alert: updated }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
