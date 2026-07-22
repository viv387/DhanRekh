import { handleWithdraw } from "@/backend/controllers/transaction.controller";

export async function POST(request: Request) {
	return handleWithdraw(request);
}
