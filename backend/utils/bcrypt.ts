import bcrypt from "bcryptjs";

import { authEnv } from "@/backend/config/env";

export async function hashPassword(password: string) {
	return bcrypt.hash(password, authEnv.bcryptRounds);
}

export async function comparePassword(password: string, hash: string) {
	return bcrypt.compare(password, hash);
}

