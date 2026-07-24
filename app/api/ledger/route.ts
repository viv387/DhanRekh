import { handleLedgerList } from "@/backend/controllers/ledger.controller";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return handleLedgerList(request);
}
