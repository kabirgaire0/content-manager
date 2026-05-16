import { redirect } from "next/navigation";
import { setSessionToken } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

async function getStatus(): Promise<{ needs_setup: boolean }> {
  const res = await fetch(`${API_BASE_URL}/auth/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`auth/status -> ${res.status}`);
  return res.json();
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const status = await getStatus();
  if (status.needs_setup) {
    redirect("/setup");
  }

  async function login(formData: FormData) {
    "use server";
    const pin = String(formData.get("pin") ?? "");
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      redirect("/login?error=1");
    }
    const data = (await res.json()) as { token: string };
    await setSessionToken(data.token);
    redirect("/");
  }

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-sm text-neutral-500">Enter your PIN to continue.</p>
      <form action={login} className="space-y-4">
        <input
          type="password"
          name="pin"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          required
          placeholder="••••••"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
        {sp.error && (
          <p className="text-sm text-red-500">Incorrect PIN, try again.</p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
