import { prisma } from "@/backend/prisma/prisma";

export const notificationRepository = {
	createForUser(userId: string, title: string, message: string) {
		return prisma.notification.create({
			data: {
				userId,
				title,
				message,
			},
		});
	},
	listForUser(userId: string) {
		return prisma.notification.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		});
	},
	countUnread(userId: string) {
		return prisma.notification.count({
			where: { userId, isRead: false },
		});
	},
	markRead(notificationId: string, userId: string) {
		return prisma.notification.updateMany({
			where: { id: notificationId, userId },
			data: { isRead: true },
		});
	},
	markAllRead(userId: string) {
		return prisma.notification.updateMany({
			where: { userId, isRead: false },
			data: { isRead: true },
		});
	},
};