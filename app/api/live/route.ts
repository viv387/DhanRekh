import { prisma } from "@/backend/prisma/prisma";
import { cacheService } from "@/backend/redis/cache.service";
import { authEnv } from "@/backend/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
	let dbStatus = "healthy";
	let redisStatus = "healthy";
	const kafkaStatus = authEnv.kafkaBrokers.length ? "configured" : "disabled";
	let isHealthy = true;

	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch {
		dbStatus = "unhealthy";
		isHealthy = false;
	}

	try {
		await cacheService.getValue("health:ping");
	} catch {
		redisStatus = "unhealthy";
		isHealthy = false;
	}

	return new Response(
		JSON.stringify({
			status: isHealthy ? "live" : "degraded",
			services: {
				database: dbStatus,
				cache: redisStatus,
				messaging: kafkaStatus,
			},
			timestamp: new Date().toISOString(),
		}),
		{
			status: isHealthy ? 200 : 503,
			headers: { "Content-Type": "application/json" },
		},
	);
}
