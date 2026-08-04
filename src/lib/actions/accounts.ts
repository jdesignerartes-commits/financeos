"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const ACCOUNT_TYPES = [
  "conta_corrente",
  "conta_digital",
  "poupanca",
  "dinheiro",
  "carteira",
  "investimento",
] as const;

const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome da conta."),
  institution: z.string().trim().optional(),
  type: z.enum(ACCOUNT_TYPES),
  color: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  initial_balance: z.coerce.number().default(0),
});

export async function saveAccount(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = accountSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    institution: formData.get("institution") || undefined,
    type: formData.get("type"),
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
    initial_balance: formData.get("initial_balance") || 0,
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
    ? await supabase.from("accounts").update(values).eq("id", id)
    : await supabase.from("accounts").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar a conta." };
  }

  revalidatePath("/contas");
}

export async function setAccountStatus(id: string, status: "ativa" | "arquivada") {
  const supabase = await createClient();
  await supabase.from("accounts").update({ status }).eq("id", id);
  revalidatePath("/contas");
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  await supabase.from("accounts").delete().eq("id", id);
  revalidatePath("/contas");
}
