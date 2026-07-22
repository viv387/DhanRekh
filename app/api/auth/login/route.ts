import { handleLogin } from "@/backend/controllers/auth.controller";

export async function POST(request: Request) {
  return handleLogin(request);
}
