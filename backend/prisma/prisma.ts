import * as PrismaClientModule from "@prisma/client";

const PrismaClientConstructor = (PrismaClientModule as unknown as {
	PrismaClient?: new (...args: never[]) => {
		$disconnect: () => Promise<void>;
	};
	default?: {
		PrismaClient?: new (...args: never[]) => {
			$disconnect: () => Promise<void>;
		};
	};
}).PrismaClient ??
	(PrismaClientModule as unknown as { default?: { PrismaClient?: new (...args: never[]) => { $disconnect: () => Promise<void> } } }).default
		?.PrismaClient;

if (!PrismaClientConstructor) {
	throw new Error("PrismaClient is not available. Run prisma generate first.");
}

const globalForPrisma = globalThis as unknown as {
	prisma?: InstanceType<typeof PrismaClientConstructor>;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClientConstructor();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}

