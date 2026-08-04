"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const budgetSchema = z.object({
  id: z.string().uuid().optional(),
  target_type: z.enum(["category", "account", "credit_card", "cost_center"]),
  target_id: z.string().uuid("Selecione o alvo do orçamento."),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Selecione o período."),
  limit_amount: z.coerce.number().positive("Informe o valor do limite."),
});

export async function saveBudget(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = budgetSchema.safeParse({
    id: formData.get("id") || undefined,
    target_type: formData.get("target_type"),
    target_id: formData.get("target_id"),
    period: formData.get("period"),
    limit_amount: formData.get("limit_amount"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { id, target_type, target_id, period, limit_amount } = parsed.data;
  const [periodYear, periodMonth] = period.split("-").map(Number);

  const values = {
    limit_amount,
    period_year: periodYear,
    period_month: periodMonth,
    category_id: target_type === "category" ? target_id : null,
    account_id: target_type === "account" ? target_id : null,
    credit_card_id: target_type === "credit_card" ? target_id : null,
    cost_center_id: target_type === "cost_center" ? target_id : null,
  };

  const { error } = id
    ? await supabase.from("budgets").update(values).eq("id", id)
    : await supabase.from("budgets").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar o orçamento." };
  }

  revalidatePath("/orcamentos");
}

export async function deleteBudget(id: string) {
  const supabase = await createClient();
  await supabase.from("budgets").delete().eq("id", id);
  revalidatePath("/orcamentos");
}
