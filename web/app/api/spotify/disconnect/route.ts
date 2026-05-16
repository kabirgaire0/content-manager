import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = await fetch(`${API_BASE_URL}/spotify/connection`, {
    method: "DELETE",
  });
  return new NextResponse(null, { status: res.status });
}
