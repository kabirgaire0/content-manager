import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(apiUrl(`/items/${id}/audio`), {
    headers: await authHeaders(),
  });
  if (!res.ok || !res.body) {
    return NextResponse.json(
      { error: "audio not found" },
      { status: res.status || 404 },
    );
  }
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "content-type":
        res.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "no-store",
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const incoming = await req.formData();
  const res = await fetch(apiUrl(`/items/${id}/audio`), {
    method: "POST",
    body: incoming,
    headers: await authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
