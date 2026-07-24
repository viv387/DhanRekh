import { randomBytes } from "node:crypto";
import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { prisma } from "@/backend/prisma/prisma";

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

		const secret = randomBytes(20).toString("hex");

		await prisma.user.update({
			where: { id: user.id },
			data: {
				twoFactorEnabled: true,
				twoFactorSecret: secret,
			},
		});

		return new Response(
			JSON.stringify({
				message: "Two-factor authentication enabled",
				secret,
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch {
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
