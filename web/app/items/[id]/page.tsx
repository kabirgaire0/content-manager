import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ApiError, itemsApi, KIND_LABELS } from "@/lib/api";
import { ItemForm } from "@/components/ItemForm";
import { VoiceMemoForm } from "@/components/VoiceMemoForm";
import { buildItemInput } from "@/lib/form";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let item;
  try {
    item = await itemsApi.get(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  async function updateItem(formData: FormData) {
    "use server";
    const input = buildItemInput(formData);
    await itemsApi.update(id, input);
    revalidatePath("/");
    revalidatePath(`/items/${id}`);
    redirect("/");
  }

  async function deleteItem() {
    "use server";
    await itemsApi.remove(id);
    revalidatePath("/");
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit {KIND_LABELS[item.kind].toLowerCase()}
        </h1>
        <form action={deleteItem}>
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        </form>
      </div>
      {item.kind === "voice_memo" ? (
        <VoiceMemoForm initial={item} />
      ) : (
        <ItemForm
          action={updateItem}
          submitLabel="Save changes"
          kind={item.kind}
          initial={item}
        />
      )}
    </div>
  );
}
