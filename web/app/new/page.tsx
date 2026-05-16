import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { postsApi } from "@/lib/api";
import { PostForm } from "@/components/PostForm";

export const dynamic = "force-dynamic";

async function createPost(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return;
  }
  const body = String(formData.get("body") ?? "");
  const status =
    formData.get("status") === "published" ? "published" : "draft";
  await postsApi.create({ title, body, status });
  revalidatePath("/");
  redirect("/");
}

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
      <PostForm action={createPost} submitLabel="Create post" />
    </div>
  );
}
