const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export type Post = {
  id: number;
  title: string;
  body: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

export type PostInput = {
  title: string;
  body: string;
  status: "draft" | "published";
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(
      `API ${init?.method ?? "GET"} ${path} failed: ${res.status} ${text}`,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const postsApi = {
  list: () => request<Post[]>("/posts"),
  get: (id: number) => request<Post>(`/posts/${id}`),
  create: (input: PostInput) =>
    request<Post>("/posts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: number, input: PostInput) =>
    request<Post>(`/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  remove: (id: number) =>
    request<void>(`/posts/${id}`, { method: "DELETE" }),
};

export { ApiError };
