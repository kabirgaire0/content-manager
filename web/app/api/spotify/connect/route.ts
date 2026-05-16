import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

// Browser hits /api/spotify/connect -> we 302 to the API's login route,
// which itself redirects to Spotify's consent screen.
export async function GET() {
  return NextResponse.redirect(`${API_BASE_URL}/spotify/login`, 302);
}
