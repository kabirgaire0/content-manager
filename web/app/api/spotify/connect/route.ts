import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

// The browser can't carry the Bearer token through a top-level navigation,
// so this server-side handler trades the session cookie for a short-lived
// signed ticket and then 302s the browser to /spotify/login?t=<ticket>.
// Direct hits to /spotify/login without a ticket are rejected by the API.
export async function GET(req: Request) {
  const headers = await authHeaders();
  if (!headers.authorization) {
    return NextResponse.redirect(new URL("/login", req.url), 302);
  }

  const res = await fetch(apiUrl("/spotify/ticket"), {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    return NextResponse.redirect(
      new URL("/?spotify_error=ticket", req.url),
      302,
    );
  }
  const { ticket } = (await res.json()) as { ticket: string };
  return NextResponse.redirect(
    `${apiUrl("/spotify/login")}?t=${encodeURIComponent(ticket)}`,
    302,
  );
}
