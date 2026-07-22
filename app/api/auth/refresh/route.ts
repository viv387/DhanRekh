import { handleRefresh } from "@/backend/controllers/auth.controller";

export async function POST(request: Request) {
  return handleRefresh(request);
}
