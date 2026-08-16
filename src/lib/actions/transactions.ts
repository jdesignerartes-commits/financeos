"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { learnMerchantCategory } from "@/lib/ingestion/merchant-learning";

export type FormState = { error?: string } | undefined;

const TRANSACTION_TYPES = [
  "receita",
  "despesa",
  "transferencia",
  "pagamento_fatura",
  "estorno",
  "reembolso",
  "cashback",
  "tarifa",
  "juros",
  "iof",
  "imposto",
  "saque",
  "deposito",
] as const;

const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().min(1, "Informe a data."),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  friendly_description: z.string().trim().min(1, "Informe uma descrição."),
  account_id: z.string().uuid().nullable(),
  credit_card_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  subcategory_id: z.string().uuid().nullable(),
  merchant_id: z.string().uuid().nullable(),
  cost_center_id: z.string().uuid().nullable(),
  payment_method: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function orNull(value: FormDataEntryValue | null) {
  return !value || value === "none" ? null : value;
}

export async function saveTransaction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = transactionSchema.safeParse({
    id: formData.get("id") || undefined,
    date: formData.get("date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    friendly_description: formData.get("friendly_description"),
    account_id: orNull(formData.get("account_id")),
    credit_card_id: orNull(formData.get("credit_card_id")),
    category_id: orNull(formData.get("category_id")),
    subcategory_id: orNull(formData.get("subcategory_id")),
    merchant_id: orNull(formData.get("merchant_id")),
    cost_center_id: orNull(formData.get("cost_center_id")),
    payment_method: orNull(formData.get("payment_method")) ?? undefined,
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
    ? await supabase.from("transactions").update(values).eq("id", id)
    : await supabase.from("transactions").insert({ ...values, user_id: user.id, status: "confirmada" });

  if (error) {
    return { error: "Não foi possível salvar a transação." };
  }

  if (values.merchant_id && values.category_id) {
    await learnMerchantCategory(supabase, values.merchant_id, values.category_id, values.subcategory_id);
  }

  revalidatePath("/transacoes");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/transacoes");
}
