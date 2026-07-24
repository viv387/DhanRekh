import { prisma } from "@/backend/prisma/prisma";

export const dbConfig = {
	prisma,
	connect: () => prisma.$connect(),
	disconnect: () => prisma.$disconnect(),
};
