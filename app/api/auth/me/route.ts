import { handleMe } from "@/backend/controllers/auth.controller";

export async function GET(request: Request) {
  return handleMe(request);
}
