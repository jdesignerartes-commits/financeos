"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const goalSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome da meta."),
  target_amount: z.coerce.number().positive("Informe o valor da meta."),
  current_amount: z.coerce.number().nonnegative().default(0),
  account_id: z.string().uuid().nullable(),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
});

function orNull(value: FormDataEntryValue | null) {
  return !value || value === "none" ? null : String(value);
}

export async function saveGoal(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = goalSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    target_amount: formData.get("target_amount"),
    current_amount: formData.get("current_amount") || 0,
    account_id: orNull(formData.get("account_id")),
    start_date: formData.get("start_date") || undefined,
    target_date: formData.get("target_date") || undefined,
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
  const status = values.current_amount >= values.target_amount ? "concluida" : "em_andamento";

  const { error } = id
    ? await supabase.from("financial_goals").update({ ...values, status }).eq("id", id)
    : await supabase.from("financial_goals").insert({ ...values, status, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar a meta." };
  }

  revalidatePath("/metas");
}

export async function setGoalStatus(id: string, status: "em_andamento" | "concluida" | "cancelada") {
  const supabase = await createClient();
  await supabase.from("financial_goals").update({ status }).eq("id", id);
  revalidatePath("/metas");
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  await supabase.from("financial_goals").delete().eq("id", id);
  revalidatePath("/metas");
}
