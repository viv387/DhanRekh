export const dynamic = "force-dynamic";

export async function GET() {
	return new Response(
		JSON.stringify({
			status: "healthy",
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			env: process.env.NODE_ENV ?? "development",
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}
