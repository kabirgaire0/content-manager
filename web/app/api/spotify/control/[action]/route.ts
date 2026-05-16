import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

const ALLOWED = new Set(["play", "pause", "next", "previous"]);

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }
  const res = await fetch(apiUrl(`/spotify/control/${action}`), {
    method: "POST",
    headers: await authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
