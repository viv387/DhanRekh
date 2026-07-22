import { authEnv } from "@/backend/config/env";

export function buildAuthCookieHeaders(accessToken: string, refreshToken: string) {
  const secure = authEnv.isProduction ? "; Secure" : "";

  return [
    `access_token=${accessToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=900${secure}`,
    `refresh_token=${refreshToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`,
  ];
}

export function clearAuthCookieHeaders() {
  const secure = authEnv.isProduction ? "; Secure" : "";

  return [
    `access_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    `refresh_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  ];
}
