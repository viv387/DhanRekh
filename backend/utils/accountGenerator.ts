import { randomInt } from "node:crypto";

export function generateAccountNumber() {
	const segmentA = String(randomInt(10_000, 99_999));
	const segmentB = String(randomInt(10_000, 99_999));
	return `ML${segmentA}${segmentB}`;
}

