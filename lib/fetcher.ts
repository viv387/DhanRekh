export async function defaultFetcher<T = unknown>(url: string): Promise<T> {
	const res = await fetch(url, { credentials: "include" });
	if (!res.ok) {
		throw new Error(`Failed to fetch ${url}`);
	}
	return res.json() as Promise<T>;
}
