"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findDuplicateCandidates, findTransferCandidates } from "@/lib/reconciliation-compute";

export type FormState = { error?: string } | undefined;

const RECONCILIATION_TYPES = [
  "pagamento_fatura",
  "transferencia_interna",
  "estorno",
  "reembolso",
  "duplicidade",
  "tarifa",
  "saque",
  "deposito",
] as const;

function orNull(value: FormDataEntryValue | null) {
  return !value || value === "none" ? null : String(value);
}

const reconciliationSchema = z.object({
  transaction_id: z.string().uuid(),
  related_transaction_id: z.string().uuid().nullable(),
  type: z.enum(RECONCILIATION_TYPES),
  notes: z.string().trim().optional(),
});

export async function createReconciliationItem(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = reconciliationSchema.safeParse({
    transaction_id: formData.get("transaction_id"),
    related_transaction_id: orNull(formData.get("related_transaction_id")),
    type: formData.get("type"),
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

  const { error } = await supabase
    .from("reconciliation_items")
    .insert({ ...parsed.data, user_id: user.id, status: "pendente" });

  if (error) {
    return { error: "Não foi possível criar a pendência de conciliação." };
  }

  revalidatePath("/conciliacao");
}

export async function setReconciliationStatus(id: string, status: "confirmado" | "rejeitado") {
  const supabase = await createClient();
  await supabase.from("reconciliation_items").update({ status }).eq("id", id);
  revalidatePath("/conciliacao");
}

export async function deleteReconciliationItem(id: string) {
  const supabase = await createClient();
  await supabase.from("reconciliation_items").delete().eq("id", id);
  revalidatePath("/conciliacao");
}

export async function detectReconciliationItems(): Promise<{ found: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { found: 0 };

  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const [{ data: transactions }, { data: existing }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, date, amount, type, account_id, credit_card_id, friendly_description")
      .eq("status", "confirmada")
      .gte("date", since.toISOString().slice(0, 10))
      .order("date", { ascending: true }),
    supabase.from("reconciliation_items").select("transaction_id, related_transaction_id"),
  ]);

  const linkedPairKeys = new Set(
    (existing ?? []).flatMap((item) => {
      if (!item.transaction_id || !item.related_transaction_id) return [];
      const [a, b] = [item.transaction_id, item.related_transaction_id].sort();
      return [`${a}|${b}`];
    }),
  );

  const list = (transactions ?? []).map((t) => ({ ...t, description: t.friendly_description ?? "" }));

  const candidates = [...findDuplicateCandidates(list), ...findTransferCandidates(list)];

  const rows: {
    user_id: string;
    transaction_id: string;
    related_transaction_id: string;
    type: "duplicidade" | "transferencia_interna";
    status: "pendente";
  }[] = [];
  const seenInBatch = new Set<string>();

  for (const candidate of candidates) {
    const [a, b] = [candidate.transaction.id, candidate.relatedTransaction.id].sort();
    const key = `${a}|${b}`;
    if (linkedPairKeys.has(key) || seenInBatch.has(key)) continue;
    seenInBatch.add(key);
    rows.push({
      user_id: user.id,
      transaction_id: candidate.transaction.id,
      related_transaction_id: candidate.relatedTransaction.id,
      type: candidate.type,
      status: "pendente",
    });
  }

  if (rows.length === 0) return { found: 0 };

  const { error } = await supabase.from("reconciliation_items").insert(rows);
  if (error) return { found: 0 };

  revalidatePath("/conciliacao");
  return { found: rows.length };
}

const statementBalanceSchema = z.object({
  target_type: z.enum(["account", "credit_card"]),
  target_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Informe o período."),
  informed_balance: z.coerce.number(),
});

export async function saveStatementBalance(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = statementBalanceSchema.safeParse({
    target_type: formData.get("target_type"),
    target_id: formData.get("target_id"),
    period: formData.get("period"),
    informed_balance: formData.get("informed_balance"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { target_type, target_id, informed_balance, period } = parsed.data;
  const [year, month] = period.split("-").map(Number);
  const targetColumn = target_type === "account" ? "account_id" : "credit_card_id";

  const { data: existingRow } = await supabase
    .from("statement_balances")
    .select("id")
    .eq(targetColumn, target_id)
    .eq("period_year", year)
    .eq("period_month", month)
    .maybeSingle();

  const { error } = existingRow
    ? await supabase.from("statement_balances").update({ informed_balance }).eq("id", existingRow.id)
    : await supabase.from("statement_balances").insert({
        user_id: user.id,
        account_id: target_type === "account" ? target_id : null,
        credit_card_id: target_type === "credit_card" ? target_id : null,
        period_year: year,
        period_month: month,
        informed_balance,
      });

  if (error) {
    return { error: "Não foi possível salvar o saldo informado." };
  }

  revalidatePath("/conciliacao");
}
