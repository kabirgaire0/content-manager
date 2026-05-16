import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export async function authHeaders(): Promise<Record<string, string>> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
