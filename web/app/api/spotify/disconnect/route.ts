import { NextResponse } from "next/server";
import { apiUrl, authHeaders } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = await fetch(apiUrl("/spotify/connection"), {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return new NextResponse(null, { status: res.status });
}
