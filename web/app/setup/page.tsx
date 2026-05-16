import { redirect } from "next/navigation";
import { setSessionToken } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export const dynamic = "force-dynamic";

async function getStatus(): Promise<{ needs_setup: boolean }> {
  const res = await fetch(`${API_BASE_URL}/auth/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`auth/status -> ${res.status}`);
  return res.json();
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const status = await getStatus();
  if (!status.needs_setup) {
    redirect("/login");
  }

  async function doSetup(formData: FormData) {
    "use server";
    const pin = String(formData.get("pin") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (pin.length < 4) redirect("/setup?error=short");
    if (pin !== confirm) redirect("/setup?error=mismatch");
    const res = await fetch(`${API_BASE_URL}/auth/setup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) redirect("/setup?error=failed");
    const data = (await res.json()) as { token: string };
    await setSessionToken(data.token);
    redirect("/");
  }

  const errorMessage =
    sp.error === "short"
      ? "PIN must be at least 4 characters."
      : sp.error === "mismatch"
        ? "PINs don't match."
        : sp.error === "failed"
          ? "Couldn't save PIN. Try again."
          : null;

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a PIN</h1>
      <p className="text-sm text-neutral-500">
        This locks the app to you on this device. 4 characters minimum. You can
        change it later.
      </p>
      <form action={doSetup} className="space-y-4">
        <input
          type="password"
          name="pin"
          inputMode="numeric"
          autoComplete="new-password"
          required
          minLength={4}
          maxLength={64}
          placeholder="New PIN"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="password"
          name="confirm"
          inputMode="numeric"
          autoComplete="new-password"
          required
          placeholder="Confirm PIN"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Create PIN
        </button>
      </form>
    </div>
  );
}
