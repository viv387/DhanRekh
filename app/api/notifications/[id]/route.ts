import { handleMarkNotificationRead } from "@/backend/controllers/notification.controller";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return handleMarkNotificationRead(request, id);
}