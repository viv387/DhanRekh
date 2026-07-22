import { handleDeposit } from "@/backend/controllers/transaction.controller";

export async function POST(request: Request) {
	return handleDeposit(request);
}
