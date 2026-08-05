import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { notificationService } from "@/backend/services/notification.service";
import { jsonResponse, mapError } from "@/backend/controllers/shared";


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