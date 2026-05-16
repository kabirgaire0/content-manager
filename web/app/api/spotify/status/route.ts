import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(apiUrl("/spotify/status"), {
      cache: "no-store",
      headers: await authHeaders(),
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { configured: false, connected: false, error: "api_unreachable" },
      { status: 503 },
    );
  }
}
