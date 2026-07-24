import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { notificationService } from "@/backend/services/notification.service";
import { HttpError } from "@/backend/utils/http-error";

function jsonResponse(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function mapError(error: unknown) {
	if (error instanceof HttpError) {
		return jsonResponse(error.status, { error: error.message });
	}

	return jsonResponse(500, { error: "Internal server error" });
}

export async function handleListNotifications(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const payload = await notificationService.listForUser(user.id);
		return jsonResponse(200, payload);
	} catch (error) {
		return mapError(error);
	}
}

export async function handleMarkNotificationRead(request: Request, notificationId: string) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const notification = await notificationService.markRead(user.id, notificationId);
		return jsonResponse(200, { notification });
	} catch (error) {
		return mapError(error);
	}
}

export async function handleMarkAllNotificationsRead(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const payload = await notificationService.markAllRead(user.id);
		return jsonResponse(200, payload);
	} catch (error) {
		return mapError(error);
	}
}