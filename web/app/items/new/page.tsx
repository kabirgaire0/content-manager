import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { itemsApi, KIND_LABELS, type ItemKind } from "@/lib/api";
import { ItemForm } from "@/components/ItemForm";
import { buildItemInput, isKind } from "@/lib/form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ kind?: string }>;

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const kind: ItemKind = isKind(sp.kind) ? sp.kind : "note";

  async function createItem(formData: FormData) {
    "use server";
    const input = buildItemInput(formData);
    await itemsApi.create(input);
    revalidatePath("/");
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        New {KIND_LABELS[kind].toLowerCase()}
      </h1>
      <ItemForm
        action={createItem}
        submitLabel="Create"
        kind={kind}
        allowKindChange
      />
    </div>
  );
}
