export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		credentials: "include",
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	const data = await res.json();
	if (!res.ok) {
		throw new Error(data.error ?? "API request failed");
	}

	return data as T;
}
