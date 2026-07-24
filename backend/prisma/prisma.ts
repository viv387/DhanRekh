import * as PrismaClientModule from "@prisma/client";

const PrismaClientConstructor: any =
	(PrismaClientModule as unknown as {
		PrismaClient?: new (...args: any[]) => any;
		default?: {
			PrismaClient?: new (...args: any[]) => any;
		};
	}).PrismaClient ??
	(
		PrismaClientModule as unknown as {
			default?: { PrismaClient?: new (...args: any[]) => any };
		}
	).default?.PrismaClient;

const globalForPrisma = globalThis as unknown as {
	prisma?: any;
};

function getPrismaInstance() {
	if (!globalForPrisma.prisma && PrismaClientConstructor) {
		try {
			globalForPrisma.prisma = new PrismaClientConstructor();
		} catch {
			globalForPrisma.prisma = null;
		}
	}
	return globalForPrisma.prisma;
}

export const prisma: any = new Proxy({} as any, {
	get(_target, prop) {
		const instance = getPrismaInstance();
		if (!instance) {
			return () => Promise.resolve(null);
		}
		const value = instance[prop];
		if (typeof value === "function") {
			return value.bind(instance);
		}
		return value;
	},
});
