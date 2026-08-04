"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const merchantSchema = z.object({
  id: z.string().uuid().optional(),
  display_name: z.string().trim().min(1, "Informe o nome da empresa."),
  document: z.string().trim().optional(),
  category_id: z.string().uuid().nullable(),
  subcategory_id: z.string().uuid().nullable(),
  color: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function orNull(value: FormDataEntryValue | null) {
  return !value || value === "none" ? null : value;
}

export async function saveMerchant(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = merchantSchema.safeParse({
    id: formData.get("id") || undefined,
    display_name: formData.get("display_name"),
    document: formData.get("document") || undefined,
    category_id: orNull(formData.get("category_id")),
    subcategory_id: orNull(formData.get("subcategory_id")),
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
    notes: formData.get("notes") || undefined,
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
    ? await supabase.from("merchants").update(values).eq("id", id)
    : await supabase.from("merchants").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar a empresa." };
  }

  revalidatePath("/empresas");
}

export async function deleteMerchant(id: string) {
  const supabase = await createClient();
  await supabase.from("merchants").delete().eq("id", id);
  revalidatePath("/empresas");
}

const aliasSchema = z.object({
  merchant_id: z.string().uuid(),
  raw_text: z.string().trim().min(1, "Informe o texto do alias."),
});

export async function saveAlias(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = aliasSchema.safeParse({
    merchant_id: formData.get("merchant_id"),
    raw_text: formData.get("raw_text"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("merchant_aliases").insert({ ...parsed.data, user_id: user.id });

  if (error) {
    return { error: "Este texto já está associado a outra empresa." };
  }

  revalidatePath("/empresas");
}

export async function deleteAlias(id: string) {
  const supabase = await createClient();
  await supabase.from("merchant_aliases").delete().eq("id", id);
  revalidatePath("/empresas");
}
