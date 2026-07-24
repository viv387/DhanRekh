import { prisma } from "@/backend/prisma/prisma";
import { hashPassword } from "@/backend/utils/bcrypt";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const { token, newPassword } = await request.json();
		if (!token || !newPassword || newPassword.length < 8) {
			return new Response(JSON.stringify({ error: "Invalid token or password" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const resetRecord = await prisma.passwordResetToken.findUnique({
			where: { token },
		});

		if (!resetRecord || resetRecord.expiresAt.getTime() < Date.now()) {
			return new Response(JSON.stringify({ error: "Token expired or invalid" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const passwordHash = await hashPassword(newPassword);

		await prisma.$transaction(async (tx: any) => {
			await tx.user.update({
				where: { id: resetRecord.userId },
				data: { passwordHash },
			});
			await tx.passwordResetToken.delete({ where: { token } });
		});

		return new Response(JSON.stringify({ message: "Password reset successful" }), {
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
