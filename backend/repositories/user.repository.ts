import { prisma } from "@/backend/prisma/prisma";

export const userRepository = {
	findByEmail(email: string) {
		return prisma.user.findUnique({ where: { email } });
	},
	findByUsername(username: string) {
		return prisma.user.findUnique({ where: { username } });
	},
	findByPhone(phone: string) {
		return prisma.user.findUnique({ where: { phone } });
	},
	findById(userId: string) {
		return prisma.user.findUnique({
			where: { id: userId },
			include: { wallet: true },
		});
	},
};

