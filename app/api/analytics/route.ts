import { handleAnalytics } from "@/backend/controllers/analytics.controller";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return handleAnalytics(request);
}
