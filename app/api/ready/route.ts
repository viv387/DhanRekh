import { prisma } from "@/backend/prisma/prisma";
import { cacheService } from "@/backend/redis/cache.service";

export const dynamic = "force-dynamic";

export async function GET() {
	let dbStatus = "ok";
	let redisStatus = "ok";
	let healthy = true;

	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch {
		dbStatus = "error";
		healthy = false;
	}

	try {
		await cacheService.setValue("health:check", "1");
	} catch {
		redisStatus = "error";
		healthy = false;
	}

	return new Response(
		JSON.stringify({
			status: healthy ? "ready" : "unhealthy",
			database: dbStatus,
			redis: redisStatus,
			timestamp: new Date().toISOString(),
		}),
		{
			status: healthy ? 200 : 503,
			headers: { "Content-Type": "application/json" },
		},
	);
}
