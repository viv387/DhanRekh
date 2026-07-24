import {
	handleListNotifications,
	handleMarkAllNotificationsRead,
} from "@/backend/controllers/notification.controller";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return handleListNotifications(request);
}

export async function PATCH(request: Request) {
	return handleMarkAllNotificationsRead(request);
}