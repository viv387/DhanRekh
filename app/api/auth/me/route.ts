import { handleMe } from "@/backend/controllers/auth.controller";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return handleMe(request);
}
