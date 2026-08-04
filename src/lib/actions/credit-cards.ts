"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const creditCardSchema = z.object({
  id: z.string().uuid().optional(),
  account_id: z.string().uuid().nullable(),
  name: z.string().trim().min(1, "Informe o nome do cartão."),
  bank: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  last_digits: z
    .string()
    .trim()
    .regex(/^\d{0,4}$/, "Use até 4 dígitos.")
    .optional(),
  credit_limit: z.coerce.number().optional(),
  closing_day: z.coerce.number().min(1).max(31).optional(),
  due_day: z.coerce.number().min(1).max(31).optional(),
  color: z.string().trim().optional(),
});

export async function saveCreditCard(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = creditCardSchema.safeParse({
    id: formData.get("id") || undefined,
    account_id: formData.get("account_id") || null,
    name: formData.get("name"),
    bank: formData.get("bank") || undefined,
    brand: formData.get("brand") || undefined,
    last_digits: formData.get("last_digits") || undefined,
    credit_limit: formData.get("credit_limit") || undefined,
    closing_day: formData.get("closing_day") || undefined,
    due_day: formData.get("due_day") || undefined,
    color: formData.get("color") || undefined,
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
    ? await supabase.from("credit_cards").update(values).eq("id", id)
    : await supabase.from("credit_cards").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar o cartão." };
  }

  revalidatePath("/cartoes");
}

export async function setCreditCardStatus(id: string, status: "ativo" | "arquivado") {
  const supabase = await createClient();
  await supabase.from("credit_cards").update({ status }).eq("id", id);
  revalidatePath("/cartoes");
}

export async function deleteCreditCard(id: string) {
  const supabase = await createClient();
  await supabase.from("credit_cards").delete().eq("id", id);
  revalidatePath("/cartoes");
}
