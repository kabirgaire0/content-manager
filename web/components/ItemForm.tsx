import Link from "next/link";
import { ITEM_KINDS, type Item, type ItemKind, KIND_LABELS } from "@/lib/api";

const COLORS = ["", "yellow", "green", "blue", "pink", "purple", "orange"];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  kind: ItemKind;
  initial?: Item;
  allowKindChange?: boolean;
};

export function ItemForm({
  action,
  submitLabel,
  kind,
  initial,
  allowKindChange,
}: Props) {
  const showUrl =
    kind === "bookmark" || kind === "video" || kind === "quick_link";
  const showEvent = kind === "schedule";
  const showEntryDate = kind === "diary";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />

      {allowKindChange && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Kind</label>
          <div className="flex flex-wrap gap-2">
            {ITEM_KINDS.map((k) => (
              <Link
                key={k}
                href={`?kind=${k}`}
                replace
                className={
                  k === kind
                    ? "rounded-full bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-neutral-900"
                    : "rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                }
              >
                {KIND_LABELS[k]}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium">
          Title{kind === "memo" ? " (optional)" : ""}
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={initial?.title ?? ""}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {showUrl && (
        <div className="space-y-1.5">
          <label htmlFor="url" className="block text-sm font-medium">
            URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            defaultValue={initial?.url ?? ""}
            placeholder="https://..."
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      )}

      {kind === "video" && (
        <div className="space-y-1.5">
          <label htmlFor="provider" className="block text-sm font-medium">
            Provider (optional)
          </label>
          <input
            id="provider"
            name="provider"
            type="text"
            defaultValue={initial?.provider ?? ""}
            placeholder="youtube, vimeo, ..."
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      )}

      {showEvent && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="event_at" className="block text-sm font-medium">
              When
            </label>
            <input
              id="event_at"
              name="event_at"
              type="datetime-local"
              required
              defaultValue={toLocalInput(initial?.event_at)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="duration_min"
              className="block text-sm font-medium"
            >
              Duration (min)
            </label>
            <input
              id="duration_min"
              name="duration_min"
              type="number"
              min={0}
              defaultValue={initial?.duration_min ?? ""}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>
      )}

      {showEntryDate && (
        <div className="space-y-1.5">
          <label htmlFor="entry_date" className="block text-sm font-medium">
            Date
          </label>
          <input
            id="entry_date"
            name="entry_date"
            type="date"
            defaultValue={toDateInput(initial?.entry_date)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      )}

      {kind !== "quick_link" && (
        <div className="space-y-1.5">
          <label htmlFor="body" className="block text-sm font-medium">
            {kind === "diary" ? "Entry" : "Body"}
          </label>
          <textarea
            id="body"
            name="body"
            rows={kind === "diary" ? 12 : 6}
            defaultValue={initial?.body ?? ""}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="tags" className="block text-sm font-medium">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            defaultValue={initial?.tags.join(", ") ?? ""}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="color" className="block text-sm font-medium">
            Color
          </label>
          <select
            id="color"
            name="color"
            defaultValue={initial?.color ?? ""}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          >
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c || "default"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="pinned"
            defaultChecked={initial?.pinned ?? false}
            className="rounded border-neutral-300"
          />
          Pinned
        </label>
        {initial && (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="archived"
              defaultChecked={initial.archived}
              className="rounded border-neutral-300"
            />
            Archived
          </label>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {submitLabel}
        </button>
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
