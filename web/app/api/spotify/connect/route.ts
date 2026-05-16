import { NextResponse } from "next/server";
import { apiUrl, authHeaders, publicApiUrl } from "@/lib/proxy";

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

  // Mint the ticket via the internal API URL (works in Docker network),
  // but redirect the browser to the public one so it can actually reach it.
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
    `${publicApiUrl("/spotify/login")}?t=${encodeURIComponent(ticket)}`,
    302,
  );
}
