import { handleTransactionsList } from "@/backend/controllers/transaction.controller";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return handleTransactionsList(request);
}
