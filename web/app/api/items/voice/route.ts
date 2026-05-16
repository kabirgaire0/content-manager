import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const incoming = await req.formData();
  const res = await fetch(`${API_BASE_URL}/items/voice`, {
    method: "POST",
    body: incoming,
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
