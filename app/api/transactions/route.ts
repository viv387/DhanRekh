import { handleTransactionsList } from "@/backend/controllers/transaction.controller";

export async function GET(request: Request) {
	return handleTransactionsList(request);
}
