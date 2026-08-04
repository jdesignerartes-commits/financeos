"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const subscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome da assinatura."),
  merchant_id: z.string().uuid().nullable(),
  credit_card_id: z.string().uuid().nullable(),
  account_id: z.string().uuid().nullable(),
  current_amount: z.coerce.number().nonnegative().optional(),
  frequency: z.enum(["mensal", "anual", "semanal", "outro"]),
  last_charge_date: z.string().optional(),
  next_expected_date: z.string().optional(),
});

function orNull(value: FormDataEntryValue | null) {
  return !value || value === "none" ? null : String(value);
}

export async function saveSubscription(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = subscriptionSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    merchant_id: orNull(formData.get("merchant_id")),
    credit_card_id: orNull(formData.get("credit_card_id")),
    account_id: orNull(formData.get("account_id")),
    current_amount: formData.get("current_amount") || undefined,
    frequency: formData.get("frequency") || "mensal",
    last_charge_date: formData.get("last_charge_date") || undefined,
    next_expected_date: formData.get("next_expected_date") || undefined,
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
    ? await supabase.from("subscriptions").update(values).eq("id", id)
    : await supabase.from("subscriptions").insert({ ...values, user_id: user.id, status: "ativa" });

  if (error) {
    return { error: "Não foi possível salvar a assinatura." };
  }

  revalidatePath("/assinaturas");
}

export async function setSubscriptionStatus(id: string, status: "ativa" | "rejeitada" | "cancelada") {
  const supabase = await createClient();
  await supabase.from("subscriptions").update({ status }).eq("id", id);
  revalidatePath("/assinaturas");
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient();
  await supabase.from("subscriptions").delete().eq("id", id);
  revalidatePath("/assinaturas");
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function detectSubscriptions(): Promise<{ found: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { found: 0 };

  const [{ data: transactions }, { data: existing }] = await Promise.all([
    supabase
      .from("transactions")
      .select("merchant_id, amount, date, credit_card_id, account_id")
      .eq("type", "despesa")
      .not("merchant_id", "is", null)
      .order("date", { ascending: true }),
    supabase.from("subscriptions").select("merchant_id"),
  ]);

  const existingMerchantIds = new Set((existing ?? []).map((s) => s.merchant_id).filter(Boolean));

  const byMerchant = new Map<string, { amount: number; date: string; credit_card_id: string | null; account_id: string | null }[]>();
  for (const t of transactions ?? []) {
    if (!t.merchant_id) continue;
    const list = byMerchant.get(t.merchant_id) ?? [];
    list.push({ amount: t.amount, date: t.date, credit_card_id: t.credit_card_id, account_id: t.account_id });
    byMerchant.set(t.merchant_id, list);
  }

  const candidates: {
    user_id: string;
    merchant_id: string;
    credit_card_id: string | null;
    account_id: string | null;
    name: string;
    current_amount: number;
    frequency: "mensal";
    last_charge_date: string;
    next_expected_date: string;
    status: "sugerida";
  }[] = [];

  for (const [merchantId, occurrences] of byMerchant) {
    if (existingMerchantIds.has(merchantId)) continue;
    if (occurrences.length < 2) continue;

    const avg = occurrences.reduce((acc, o) => acc + o.amount, 0) / occurrences.length;
    const withinTolerance = occurrences.every((o) => Math.abs(o.amount - avg) / avg <= 0.15);
    if (!withinTolerance) continue;

    const firstDate = new Date(occurrences[0].date).getTime();
    const lastDate = new Date(occurrences[occurrences.length - 1].date).getTime();
    const spanMonths = (lastDate - firstDate) / MONTH_MS;
    const roughlyMonthly = spanMonths / (occurrences.length - 1) >= 0.8 && spanMonths / (occurrences.length - 1) <= 1.5;
    if (!roughlyMonthly) continue;

    const last = occurrences[occurrences.length - 1];
    const nextExpected = new Date(lastDate + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    candidates.push({
      user_id: user.id,
      merchant_id: merchantId,
      credit_card_id: last.credit_card_id,
      account_id: last.account_id,
      name: "",
      current_amount: Math.round(avg * 100) / 100,
      frequency: "mensal",
      last_charge_date: last.date,
      next_expected_date: nextExpected,
      status: "sugerida",
    });
  }

  if (candidates.length === 0) {
    return { found: 0 };
  }

  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, display_name")
    .in(
      "id",
      candidates.map((c) => c.merchant_id),
    );
  const merchantNameById = new Map((merchants ?? []).map((m) => [m.id, m.display_name]));

  const rows = candidates.map((c) => ({ ...c, name: merchantNameById.get(c.merchant_id) ?? "Assinatura" }));

  const { error } = await supabase.from("subscriptions").insert(rows);
  if (error) return { found: 0 };

  revalidatePath("/assinaturas");
  return { found: rows.length };
}
