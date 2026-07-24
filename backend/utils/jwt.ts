import jwt from "jsonwebtoken";

import { authEnv } from "@/backend/config/env";

export type AuthTokenPayload = {
	userId: string;
	email: string;
	username: string;
};

export function signAccessToken(payload: AuthTokenPayload) {
	return jwt.sign(payload, authEnv.accessTokenSecret, {
		expiresIn: authEnv.accessTokenExpiresIn as any,
	});
}

export function signRefreshToken(payload: AuthTokenPayload) {
	return jwt.sign(payload, authEnv.refreshTokenSecret, {
		expiresIn: authEnv.refreshTokenExpiresIn as any,
	});
}

export function verifyAccessToken(token: string) {
	return jwt.verify(token, authEnv.accessTokenSecret) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string) {
	return jwt.verify(token, authEnv.refreshTokenSecret) as AuthTokenPayload;
}

