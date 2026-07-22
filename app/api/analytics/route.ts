import { handleAnalytics } from "@/backend/controllers/analytics.controller";

export async function GET(request: Request) {
	return handleAnalytics(request);
}
