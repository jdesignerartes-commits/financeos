"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  revalidatePath("/", "layout");
}

export async function deleteNotification(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id);
  revalidatePath("/", "layout");
}

type NewNotification = {
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
};

export async function checkAndCreateNotifications(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${period}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
  const inThreeDays = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    { data: budgets },
    { data: expenseTransactions },
    { data: subscriptions },
    { data: creditCards },
    { data: goals },
    { data: existingNotifications },
  ] = await Promise.all([
    supabase.from("budgets").select("*").eq("period_year", year).eq("period_month", month),
    supabase
      .from("transactions")
      .select("amount, category_id, account_id, credit_card_id, cost_center_id")
      .eq("type", "despesa")
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("subscriptions")
      .select("id, name, next_expected_date")
      .eq("status", "ativa")
      .gte("next_expected_date", todayStr)
      .lte("next_expected_date", inThreeDays),
    supabase.from("credit_cards").select("id, name, due_day").eq("status", "ativo"),
    supabase.from("financial_goals").select("id, name, current_amount, target_amount").eq("status", "em_andamento"),
    supabase.from("notifications").select("type, metadata").order("created_at", { ascending: false }).limit(300),
  ]);

  const existing = existingNotifications ?? [];
  function alreadyNotified(type: string, match: Record<string, unknown>) {
    return existing.some(
      (n) =>
        n.type === type &&
        Object.entries(match).every(([key, value]) => (n.metadata as Record<string, unknown> | null)?.[key] === value),
    );
  }

  const rows: NewNotification[] = [];

  for (const budget of budgets ?? []) {
    const used = (expenseTransactions ?? [])
      .filter((t) => {
        if (budget.category_id) return t.category_id === budget.category_id;
        if (budget.account_id) return t.account_id === budget.account_id;
        if (budget.credit_card_id) return t.credit_card_id === budget.credit_card_id;
        if (budget.cost_center_id) return t.cost_center_id === budget.cost_center_id;
        return false;
      })
      .reduce((acc, t) => acc + t.amount, 0);
    const percent = budget.limit_amount > 0 ? (used / budget.limit_amount) * 100 : 0;
    if (percent < 90) continue;
    if (alreadyNotified("orcamento_alerta", { budget_id: budget.id, period })) continue;
    rows.push({
      user_id: user.id,
      type: "orcamento_alerta",
      title: percent >= 100 ? "Orçamento estourado" : "Orçamento quase no limite",
      message: `Uso de ${percent.toFixed(0)}% do limite neste mês.`,
      metadata: { budget_id: budget.id, period },
    });
  }

  for (const sub of subscriptions ?? []) {
    if (!sub.next_expected_date) continue;
    if (alreadyNotified("assinatura_proxima", { subscription_id: sub.id, next_expected_date: sub.next_expected_date }))
      continue;
    rows.push({
      user_id: user.id,
      type: "assinatura_proxima",
      title: "Cobrança de assinatura em breve",
      message: `${sub.name} deve cobrar em ${new Date(`${sub.next_expected_date}T00:00:00`).toLocaleDateString("pt-BR")}.`,
      metadata: { subscription_id: sub.id, next_expected_date: sub.next_expected_date },
    });
  }

  for (const card of creditCards ?? []) {
    if (!card.due_day) continue;
    const diff = card.due_day - today.getDate();
    if (diff < 0 || diff > 3) continue;
    if (alreadyNotified("fatura_vencendo", { credit_card_id: card.id, period })) continue;
    rows.push({
      user_id: user.id,
      type: "fatura_vencendo",
      title: "Fatura de cartão vencendo",
      message: `A fatura do cartão ${card.name} vence dia ${card.due_day}.`,
      metadata: { credit_card_id: card.id, period },
    });
  }

  for (const goal of goals ?? []) {
    if (goal.current_amount < goal.target_amount) continue;
    if (alreadyNotified("meta_atingida", { goal_id: goal.id })) continue;
    rows.push({
      user_id: user.id,
      type: "meta_atingida",
      title: "Meta atingida!",
      message: `Você atingiu a meta "${goal.name}".`,
      metadata: { goal_id: goal.id },
    });
  }

  if (rows.length === 0) return;
  await supabase.from("notifications").insert(rows);
}
