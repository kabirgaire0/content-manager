import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ApiError, postsApi } from "@/lib/api";
import { PostForm } from "@/components/PostForm";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let post;
  try {
    post = await postsApi.get(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  async function updatePost(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const body = String(formData.get("body") ?? "");
    const status =
      formData.get("status") === "published" ? "published" : "draft";
    await postsApi.update(id, { title, body, status });
    revalidatePath("/");
    revalidatePath(`/posts/${id}`);
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit post</h1>
      <PostForm
        action={updatePost}
        submitLabel="Save changes"
        initial={{
          title: post.title,
          body: post.body,
          status: post.status,
        }}
      />
    </div>
  );
}
