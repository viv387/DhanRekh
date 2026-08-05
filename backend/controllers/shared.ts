import { z } from "zod";
import { HttpError } from "@/backend/utils/http-error";

/**
 * Shared JSON response builder for all controllers.
 */
export function jsonResponse(status: number, body: unknown, cookies: string[] = []) {
	const headers = new Headers({ "Content-Type": "application/json" });
	for (const cookie of cookies) {
		headers.append("Set-Cookie", cookie);
	}
	return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Shared error mapper for all controllers.
 * Handles HttpError, ZodError, and generic errors gracefully.
 */
export function mapError(error: unknown) {
	// Known HTTP errors (401, 403, 404, 409, etc.)
	if (error instanceof HttpError) {
		return jsonResponse(error.status, { error: error.message });
	}

	// Zod validation errors → 422 Unprocessable Entity with field details
	if (error instanceof z.ZodError) {
		return jsonResponse(422, {
			error: "Validation failed",
			details: (error as z.ZodError).issues.map((e) => ({
				field: e.path.join("."),
				message: e.message,
			})),
		});
	}

	// Unknown errors → 500
	console.error("[Controller] Unhandled error:", error);
	return jsonResponse(500, { error: "Internal server error" });
}
