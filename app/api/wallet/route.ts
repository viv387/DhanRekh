import { handleCreateWallet, handleGetWallet } from "@/backend/controllers/wallet.controller";

export async function GET(request: Request) {
  return handleGetWallet(request);
}

export async function POST(request: Request) {
  return handleCreateWallet(request);
}
