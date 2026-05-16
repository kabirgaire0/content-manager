import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessionsApi } from "@/lib/api";
import { clearSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function shortUA(ua: string | null): string {
  if (!ua) return "Unknown device";
  // Cheap heuristics — good enough for "is this the iPhone or the laptop"
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh|Mac OS/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return ua.slice(0, 60);
}

function browserName(ua: string | null): string | null {
  if (!ua) return null;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return null;
}

export default async function DevicesPage() {
  const sessions = await sessionsApi.list();

  async function revoke(formData: FormData) {
    "use server";
    const id = String(formData.get("session_id") ?? "");
    const isCurrent = formData.get("is_current") === "1";
    if (!id) return;
    await sessionsApi.revoke(id);
    if (isCurrent) {
      await clearSessionToken();
      redirect("/login");
    }
    revalidatePath("/devices");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Active sessions on your account. Revoke any device you don't
          recognise.
        </p>
      </div>

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {sessions.map((s) => {
          const browser = browserName(s.user_agent);
          return (
            <li
              key={s.session_id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">
                    {shortUA(s.user_agent)}
                    {browser ? ` · ${browser}` : ""}
                  </p>
                  {s.is_current && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      this device
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Last seen {formatDate(s.last_seen_at)} · signed in{" "}
                  {formatDate(s.created_at)}
                </p>
              </div>
              <form action={revoke}>
                <input type="hidden" name="session_id" value={s.session_id} />
                <input
                  type="hidden"
                  name="is_current"
                  value={s.is_current ? "1" : "0"}
                />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  {s.is_current ? "Sign out" : "Revoke"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
