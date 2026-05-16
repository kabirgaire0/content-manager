import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { postsApi } from "@/lib/api";

export const dynamic = "force-dynamic";

async function deletePost(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    await postsApi.remove(id);
    revalidatePath("/");
  }
  redirect("/");
}

export default async function HomePage() {
  const posts = await postsApi.list();

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <p className="text-sm text-neutral-500">{posts.length} total</p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-neutral-500">No posts yet.</p>
          <Link
            href="/new"
            className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Create your first post
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/posts/${post.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {post.title}
                  </Link>
                  <span
                    className={
                      post.status === "published"
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    }
                  >
                    {post.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Updated {post.updated_at}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/posts/${post.id}`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Edit
                </Link>
                <form action={deletePost}>
                  <input type="hidden" name="id" value={post.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
