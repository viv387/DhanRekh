import { getAuthenticatedUser } from "@/backend/middleware/auth.middleware";
import { analyticsService } from "@/backend/services/analytics.service";
import { jsonResponse, mapError } from "@/backend/controllers/shared";


export async function handleAnalytics(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return jsonResponse(401, { error: "Unauthorized" });
		}

		const analytics = await analyticsService.getDashboardSummary(user.id);
		return jsonResponse(200, analytics);
	} catch (error) {
		return mapError(error);
	}
}
