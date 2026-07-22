import { handleSignup } from "@/backend/controllers/auth.controller";

export async function POST(request: Request) {
  return handleSignup(request);
}
