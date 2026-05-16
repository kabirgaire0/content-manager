import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json();
  const res = await fetch(apiUrl(`/items/${id}`), {
    method: "PUT",
    body: JSON.stringify(json),
    headers: {
      "content-type": "application/json",
      ...(await authHeaders()),
    },
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(apiUrl(`/items/${id}`), {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return new NextResponse(null, { status: res.status });
}
