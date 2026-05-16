import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";
import { clearSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Best-effort: tell the API to invalidate the session row, then clear the cookie.
  try {
    await fetch(apiUrl("/auth/logout"), {
      method: "POST",
      headers: await authHeaders(),
    });
  } catch {
    // ignore — clearing the cookie below is enough to lock the user out locally
  }
  await clearSessionToken();
  const url = new URL("/login", req.url);
  return NextResponse.redirect(url, 303);
}
