import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { otpService } from "@/backend/services/otp.service";
import { prisma } from "@/backend/prisma/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const secret = otpService.generateCode();

		await prisma.user.update({
			where: { id: user.id },
			data: {
				twoFactorEnabled: true,
				twoFactorSecret: secret,
			},
		});

		return Response.json({
			message: "Two-factor authentication enabled",
			secret,
		});
	} catch (error) {
		console.error("[2FA Setup]", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
