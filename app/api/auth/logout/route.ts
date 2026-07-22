import { handleLogout } from "@/backend/controllers/auth.controller";

export async function POST(request: Request) {
  return handleLogout(request);
}
