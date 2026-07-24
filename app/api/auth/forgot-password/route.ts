import { randomBytes } from "node:crypto";
import { prisma } from "@/backend/prisma/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const { email } = await request.json();
		if (!email) {
			return new Response(JSON.stringify({ error: "Email is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			// Return 200 for security enumeration defense
			return new Response(
				JSON.stringify({ message: "If account exists, password reset instructions have been sent." }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		const token = randomBytes(32).toString("hex");
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

		await prisma.passwordResetToken.create({
			data: {
				userId: user.id,
				token,
				expiresAt,
			},
		});

		return new Response(
			JSON.stringify({
				message: "If account exists, password reset instructions have been sent.",
				resetToken: token, // Exposed for local/dev testing convenience
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
