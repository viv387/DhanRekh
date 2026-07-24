import { handleWithdraw } from "@/backend/controllers/transaction.controller";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return handleWithdraw(request);
}
