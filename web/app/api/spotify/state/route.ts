import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(apiUrl("/spotify/state"), {
    cache: "no-store",
    headers: await authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
