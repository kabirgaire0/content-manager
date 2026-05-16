import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const incoming = await req.formData();
  const res = await fetch(apiUrl("/items/voice"), {
    method: "POST",
    body: incoming,
    headers: await authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
