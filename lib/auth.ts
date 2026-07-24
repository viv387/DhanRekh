export function getAuthTokenFromHeader(headers: Headers): string | null {
	const authHeader = headers.get("authorization");
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.substring(7);
	}
	return null;
}
