"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome da regra."),
  field: z.enum(["descricao", "estabelecimento", "valor", "conta", "cartao"]),
  operator: z.enum(["contem", "igual", "comeca_com", "termina_com", "regex", "maior_que", "menor_que"]),
  search_value: z.string().trim().min(1, "Informe o valor buscado."),
  action_type: z.enum([
    "categorizar",
    "definir_empresa",
    "definir_centro_custo",
    "marcar_transferencia",
    "ignorar",
  ]),
  action_value: z.string().trim().optional(),
  priority: z.coerce.number().int().default(0),
});

export async function saveAutomationRule(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actionValueRaw = formData.get("action_value");
  const parsed = ruleSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    field: formData.get("field"),
    operator: formData.get("operator"),
    search_value: formData.get("search_value"),
    action_type: formData.get("action_type"),
    action_value: !actionValueRaw || actionValueRaw === "none" ? undefined : String(actionValueRaw),
    priority: formData.get("priority") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (["categorizar", "definir_empresa", "definir_centro_custo"].includes(parsed.data.action_type) && !parsed.data.action_value) {
    return { error: "Selecione o valor da ação." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { id, ...values } = parsed.data;

  const { error } = id
    ? await supabase.from("automation_rules").update(values).eq("id", id)
    : await supabase.from("automation_rules").insert({ ...values, user_id: user.id });

  if (error) {
    return { error: "Não foi possível salvar a regra." };
  }

  revalidatePath("/configuracoes");
}

export async function setAutomationRuleStatus(id: string, status: "ativa" | "inativa") {
  const supabase = await createClient();
  await supabase.from("automation_rules").update({ status }).eq("id", id);
  revalidatePath("/configuracoes");
}

export async function deleteAutomationRule(id: string) {
  const supabase = await createClient();
  await supabase.from("automation_rules").delete().eq("id", id);
  revalidatePath("/configuracoes");
}
