"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const installmentSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().trim().min(1, "Informe a descrição da compra."),
  credit_card_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  installment_amount: z.coerce.number().positive("Informe o valor da parcela."),
  total_installments: z.coerce.number().int().min(1, "Informe o total de parcelas."),
  start_date: z.string().min(1, "Informe a data de início."),
});

function orNull(value: FormDataEntryValue | null) {
  return !value || value === "none" ? null : String(value);
}

export async function saveInstallment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = installmentSchema.safeParse({
    id: formData.get("id") || undefined,
    description: formData.get("description"),
    credit_card_id: orNull(formData.get("credit_card_id")),
    category_id: orNull(formData.get("category_id")),
    installment_amount: formData.get("installment_amount"),
    total_installments: formData.get("total_installments"),
    start_date: formData.get("start_date"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { id, installment_amount, total_installments, ...rest } = parsed.data;
  const values = {
    ...rest,
    installment_amount,
    total_installments,
    total_amount: Math.round(installment_amount * total_installments * 100) / 100,
  };

  const { error } = id
    ? await supabase.from("installments").update(values).eq("id", id)
    : await supabase.from("installments").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar o parcelamento." };
  }

  revalidatePath("/parcelamentos");
}

export async function deleteInstallment(id: string) {
  const supabase = await createClient();
  await supabase.from("installments").delete().eq("id", id);
  revalidatePath("/parcelamentos");
}
