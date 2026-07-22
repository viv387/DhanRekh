import { handleLedgerList } from "@/backend/controllers/ledger.controller";

export async function GET(request: Request) {
	return handleLedgerList(request);
}
