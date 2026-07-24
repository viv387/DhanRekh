import { handleSignup } from "@/backend/controllers/auth.controller";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return handleSignup(request);
}
