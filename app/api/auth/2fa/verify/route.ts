/**
 * POST /api/auth/2fa/verify
 * Verifies the 6-digit TOTP token and ENABLES 2FA on the account.
 * Must be called after /api/auth/2fa/setup.
 *
 * Body: { token: "123456" }
 */
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

		const body = await request.json().catch(() => ({}));
		const token = (body?.token ?? "").toString().trim();

		if (!token || token.length !== 6) {
			return Response.json(
				{ error: "Invalid token. Must be a 6-digit code from your authenticator app." },
				{ status: 422 },
			);
		}

		// Fetch the stored pending secret
		const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

		if (!dbUser?.twoFactorSecret) {
			return Response.json(
				{ error: "No 2FA setup found. Call /api/auth/2fa/setup first." },
				{ status: 400 },
			);
		}

		if (dbUser.twoFactorEnabled) {
			return Response.json(
				{ error: "2FA is already active on this account." },
				{ status: 409 },
			);
		}

		// Verify the token against the stored secret
		const isValid = otpService.verifyCode(dbUser.twoFactorSecret, token);

		if (!isValid) {
			return Response.json(
				{ error: "Invalid or expired OTP code. Please try again." },
				{ status: 401 },
			);
		}

		// ✅ Mark 2FA as enabled
		await prisma.user.update({
			where: { id: user.id },
			data:  { twoFactorEnabled: true },
		});

		await prisma.auditLog.create({
			data: { userId: user.id, action: "auth.2fa.enabled" },
		});

		return Response.json({
			message: "✅ Two-factor authentication enabled successfully! Your account is now protected.",
		});
	} catch (error) {
		console.error("[2FA Verify]", error);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
