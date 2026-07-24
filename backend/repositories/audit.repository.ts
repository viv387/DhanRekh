import { prisma } from "@/backend/prisma/prisma";

export const auditRepository = {
	create(userId: string, action: string, ipAddress?: string, userAgent?: string) {
		return prisma.auditLog.create({
			data: {
				userId,
				action,
				ipAddress,
				userAgent,
			},
		});
	},
	listForUser(userId: string) {
		return prisma.auditLog.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		});
	},
	listRecent(limit = 100) {
		return prisma.auditLog.findMany({
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	},
};
