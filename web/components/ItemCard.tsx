import Link from "next/link";
import type { Item } from "@/lib/api";
import { KIND_LABELS } from "@/lib/api";

const COLOR_CLASSES: Record<string, string> = {
  yellow:
    "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/60",
  green:
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60",
  blue: "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900/60",
  pink: "bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-900/60",
  purple:
    "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-900/60",
  orange:
    "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/60",
};

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ItemCard({ item }: { item: Item }) {
  const color = item.color ? COLOR_CLASSES[item.color] : "";
  const href = `/items/${item.id}`;

  return (
    <article
      className={`group relative break-inside-avoid rounded-lg border p-3 shadow-sm transition hover:shadow-md ${
        color ||
        "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {KIND_LABELS[item.kind]}
        </span>
        {item.pinned && <span title="pinned">📌</span>}
      </div>

      <Link href={href} className="block space-y-1.5">
        {item.title && (
          <h3 className="font-medium leading-tight">{item.title}</h3>
        )}

        {item.kind === "bookmark" || item.kind === "quick_link" ? (
          <p className="truncate text-sm text-sky-700 dark:text-sky-400">
            {hostnameOf(item.url)}
          </p>
        ) : null}

        {item.kind === "video" && (
          <p className="truncate text-sm text-neutral-500">
            {item.provider ?? "video"} · {hostnameOf(item.url)}
          </p>
        )}

        {item.kind === "schedule" && item.event_at && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            🗓 {formatWhen(item.event_at)}
            {item.duration_min ? ` · ${item.duration_min} min` : ""}
          </p>
        )}

        {item.kind === "diary" && item.entry_date && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {new Date(item.entry_date).toLocaleDateString()}
          </p>
        )}

        {item.body && (
          <p className="line-clamp-6 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
            {item.body}
          </p>
        )}
      </Link>

      {item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
