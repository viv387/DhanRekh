import { handleTransfer } from "@/backend/controllers/transaction.controller";

export async function POST(request: Request) {
	return handleTransfer(request);
}
