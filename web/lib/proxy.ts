import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

// Used only when the BROWSER needs to be sent to the API directly (the
// Spotify OAuth dance). Defaults to API_BASE_URL so dev "just works"; in
// production set it to the public URL (e.g. https://api.example.com)
// because the internal hostname isn't reachable from a phone or laptop.
const PUBLIC_API_BASE_URL =
  process.env.PUBLIC_API_BASE_URL ?? API_BASE_URL;

export async function authHeaders(): Promise<Record<string, string>> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function publicApiUrl(path: string): string {
  return `${PUBLIC_API_BASE_URL}${path}`;
}
