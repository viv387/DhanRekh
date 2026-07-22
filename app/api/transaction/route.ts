export async function GET() {
  return Response.json({
    message: "Transaction API",
    routes: [
      "POST /api/transaction/deposit",
      "POST /api/transaction/withdraw",
      "POST /api/transaction/transfer",
      "GET /api/transactions",
    ],
  });
}

