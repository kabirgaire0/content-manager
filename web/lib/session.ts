import { cookies } from "next/headers";

export const SESSION_COOKIE = "cm_session";
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days, must match API SESSION_TTL

export async function getSessionToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function clearSessionToken(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}
