import Link from "next/link";
import { ITEM_KINDS, type Item, type ItemKind, KIND_LABELS, itemsApi } from "@/lib/api";
import { ItemCard } from "@/components/ItemCard";
import { SpotifyWidget } from "@/components/SpotifyWidget";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ kind?: string; tag?: string; q?: string }>;

function isKind(value: string | undefined): value is ItemKind {
  return (
    value !== undefined && (ITEM_KINDS as readonly string[]).includes(value)
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const kind = isKind(sp.kind) ? sp.kind : undefined;
  const tag = sp.tag?.trim() || undefined;
  const q = sp.q?.trim() || undefined;

  const items = await itemsApi.list({ kind, tag, q, archived: false });

  const pinned = items.filter((it) => it.pinned);
  const rest = items.filter((it) => !it.pinned);

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <SpotifyWidget />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          href={buildHref({ tag, q })}
          active={kind === undefined}
          label="All"
        />
        {ITEM_KINDS.map((k) => (
          <FilterChip
            key={k}
            href={buildHref({ kind: k, tag, q })}
            active={kind === k}
            label={KIND_LABELS[k]}
          />
        ))}
        {tag && (
          <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-neutral-200 px-3 py-1 text-xs dark:bg-neutral-800">
            #{tag}
            <Link
              href={buildHref({ kind, q })}
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              aria-label="clear tag filter"
            >
              ×
            </Link>
          </span>
        )}
        {q && (
          <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
            “{q}”
            <Link
              href={buildHref({ kind, tag })}
              className="text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-200"
              aria-label="clear search"
            >
              ×
            </Link>
          </span>
        )}
        <span className="ml-auto text-sm text-neutral-500">
          {items.length}
          {q ? ` match${items.length === 1 ? "" : "es"}` : items.length === 1 ? " item" : " items"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-neutral-500">
            {q
              ? `No matches for “${q}”.`
              : "Nothing here yet. Create your first item to get started."}
          </p>
          {!q && (
            <Link
              href="/items/new"
              className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              + New item
            </Link>
          )}
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <Section title="Pinned" items={pinned} />
          )}
          {rest.length > 0 && (
            <Section
              title={pinned.length > 0 ? "Others" : undefined}
              items={rest}
            />
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, items }: { title?: string; items: Item[] }) {
  return (
    <section className="space-y-3">
      {title && (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {title}
        </h2>
      )}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-neutral-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-neutral-900"
          : "rounded-full border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
      }
    >
      {label}
    </Link>
  );
}

function buildHref({
  kind,
  tag,
  q,
}: {
  kind?: ItemKind;
  tag?: string;
  q?: string;
}): string {
  const qs = new URLSearchParams();
  if (kind) qs.set("kind", kind);
  if (tag) qs.set("tag", tag);
  if (q) qs.set("q", q);
  const s = qs.toString();
  return s ? `/?${s}` : "/";
}
