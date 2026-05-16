import {
  ITEM_KINDS,
  type ItemInput,
  type ItemKind,
} from "@/lib/api";

export function isKind(value: unknown): value is ItemKind {
  return (
    typeof value === "string" &&
    (ITEM_KINDS as readonly string[]).includes(value)
  );
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function isoOrNull(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function buildItemInput(formData: FormData): ItemInput {
  const kindRaw = formData.get("kind");
  if (!isKind(kindRaw)) {
    throw new Error("invalid kind");
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const urlRaw = String(formData.get("url") ?? "").trim();
  const providerRaw = String(formData.get("provider") ?? "").trim();
  const iconRaw = String(formData.get("icon") ?? "").trim();
  const colorRaw = String(formData.get("color") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const eventAtRaw = String(formData.get("event_at") ?? "");
  const entryDateRaw = String(formData.get("entry_date") ?? "");
  const durationRaw = String(formData.get("duration_min") ?? "");
  const duration = durationRaw ? Number(durationRaw) : null;

  return {
    kind: kindRaw,
    title,
    body,
    url: urlRaw || null,
    provider: providerRaw || null,
    icon: iconRaw || null,
    event_at: isoOrNull(eventAtRaw),
    entry_date: entryDateRaw ? new Date(entryDateRaw).toISOString() : null,
    duration_min:
      duration !== null && Number.isFinite(duration) && duration >= 0
        ? duration
        : null,
    tags: parseTags(tagsRaw),
    color: colorRaw || null,
    pinned: formData.get("pinned") === "on",
    archived: formData.get("archived") === "on",
  };
}
