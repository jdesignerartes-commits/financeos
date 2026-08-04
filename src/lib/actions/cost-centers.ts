"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const costCenterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome do centro de custo."),
  color: z.string().trim().optional(),
  icon: z.string().trim().optional(),
});

export async function saveCostCenter(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = costCenterSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
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
    ? await supabase.from("cost_centers").update(values).eq("id", id)
    : await supabase.from("cost_centers").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar o centro de custo." };
  }

  revalidatePath("/configuracoes");
}

export async function setCostCenterStatus(id: string, status: "ativo" | "arquivado") {
  const supabase = await createClient();
  await supabase.from("cost_centers").update({ status }).eq("id", id);
  revalidatePath("/configuracoes");
}

export async function deleteCostCenter(id: string) {
  const supabase = await createClient();
  await supabase.from("cost_centers").delete().eq("id", id);
  revalidatePath("/configuracoes");
}
