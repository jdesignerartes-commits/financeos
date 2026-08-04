"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome da categoria."),
  type: z.enum(["receita", "despesa"]),
  color: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  monthly_goal: z.coerce.number().optional(),
  monthly_limit: z.coerce.number().optional(),
});

export async function saveCategory(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
    monthly_goal: formData.get("monthly_goal") || undefined,
    monthly_limit: formData.get("monthly_limit") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { id, ...values } = parsed.data;

  const { error } = id
    ? await supabase.from("categories").update(values).eq("id", id)
    : await supabase.from("categories").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar a categoria." };
  }

  revalidatePath("/categorias");
}

export async function setCategoryStatus(id: string, status: "ativa" | "arquivada") {
  const supabase = await createClient();
  await supabase.from("categories").update({ status }).eq("id", id);
  revalidatePath("/categorias");
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/categorias");
}

const subcategorySchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().trim().min(1, "Informe o nome da subcategoria."),
});

export async function saveSubcategory(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = subcategorySchema.safeParse({
    id: formData.get("id") || undefined,
    category_id: formData.get("category_id"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { id, ...values } = parsed.data;

  const { error } = id
    ? await supabase.from("subcategories").update(values).eq("id", id)
    : await supabase.from("subcategories").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar a subcategoria." };
  }

  revalidatePath("/categorias");
}

export async function deleteSubcategory(id: string) {
  const supabase = await createClient();
  await supabase.from("subcategories").delete().eq("id", id);
  revalidatePath("/categorias");
}
