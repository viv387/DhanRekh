export async function GET() {
  return Response.json({
    message: "Auth API",
    routes: [
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
      "GET /api/auth/me",
    ],
  });
}

