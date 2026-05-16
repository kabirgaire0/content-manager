import { getSessionToken } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export const ITEM_KINDS = [
  "note",
  "memo",
  "bookmark",
  "video",
  "diary",
  "schedule",
  "quick_link",
  "voice_memo",
] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

export const KIND_LABELS: Record<ItemKind, string> = {
  note: "Note",
  memo: "Memo",
  bookmark: "Bookmark",
  video: "Video",
  diary: "Diary",
  schedule: "Schedule",
  quick_link: "Quick link",
  voice_memo: "Voice memo",
};

export type Item = {
  id: number;
  kind: ItemKind;
  title: string;
  body: string;
  url: string | null;
  provider: string | null;
  icon: string | null;
  entry_date: string | null;
  event_at: string | null;
  duration_min: number | null;
  audio_path: string | null;
  audio_mime: string | null;
  audio_duration_ms: number | null;
  transcript: string | null;
  transcript_status: "pending" | "done" | "failed" | null;
  transcript_lang: string | null;
  tags: string[];
  color: string | null;
  pinned: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ItemInput = {
  kind: ItemKind;
  title?: string;
  body?: string;
  url?: string | null;
  provider?: string | null;
  icon?: string | null;
  entry_date?: string | null;
  event_at?: string | null;
  duration_min?: number | null;
  tags?: string[];
  color?: string | null;
  pinned?: boolean;
  archived?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail: unknown = undefined;
    try {
      detail = await res.json();
    } catch {
      // ignore
    }
    throw new ApiError(
      `API ${init?.method ?? "GET"} ${path} -> ${res.status}`,
      res.status,
      detail,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type ListFilters = {
  kind?: ItemKind;
  tag?: string;
  pinned?: boolean;
  archived?: boolean;
  q?: string;
};

function toQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "",
  ) as [string, string][];
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

export const itemsApi = {
  list: (f: ListFilters = {}) =>
    request<Item[]>(
      `/items${toQuery({
        kind: f.kind,
        tag: f.tag,
        pinned: f.pinned === undefined ? undefined : String(f.pinned),
        archived: f.archived === undefined ? undefined : String(f.archived),
        q: f.q,
      })}`,
    ),
  get: (id: number) => request<Item>(`/items/${id}`),
  create: (input: ItemInput) =>
    request<Item>("/items", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: ItemInput) =>
    request<Item>(`/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  remove: (id: number) =>
    request<void>(`/items/${id}`, { method: "DELETE" }),
};
