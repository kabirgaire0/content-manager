import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

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
  const res = await fetch(`${API_BASE_URL}/spotify/control/${action}`, {
    method: "POST",
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
