import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(apiUrl(`/items/${id}/transcribe`), {
    method: "POST",
    headers: await authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
