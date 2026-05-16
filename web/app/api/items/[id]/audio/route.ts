import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${API_BASE_URL}/items/${id}/audio`);
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
  const res = await fetch(`${API_BASE_URL}/items/${id}/audio`, {
    method: "POST",
    body: incoming,
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
