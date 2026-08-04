import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCalculatedBalance } from "@/lib/reconciliation-compute";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export const ASSISTANT_TOOLS = [
  {
    name: "get_transactions_summary",
    description:
      "Retorna o total, a quantidade e um resumo por categoria e por empresa das transações do usuário em um período. Use para perguntas sobre quanto foi gasto ou recebido, no total ou por categoria/empresa.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_date: { type: "string", description: "Data inicial no formato YYYY-MM-DD" },
        end_date: { type: "string", description: "Data final no formato YYYY-MM-DD" },
        type: { type: "string", enum: ["receita", "despesa"], description: "Filtrar por tipo (opcional)" },
        category_name: { type: "string", description: "Filtrar por nome (parcial) de categoria (opcional)" },
        merchant_name: { type: "string", description: "Filtrar por nome (parcial) de empresa/estabelecimento (opcional)" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "list_transactions",
    description:
      "Lista transações individuais (data, descrição, valor, tipo, categoria, empresa) que atendem aos filtros. Use para perguntas sobre transações específicas.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_date: { type: "string", description: "Data inicial no formato YYYY-MM-DD" },
        end_date: { type: "string", description: "Data final no formato YYYY-MM-DD" },
        type: { type: "string", enum: ["receita", "despesa"] },
        category_name: { type: "string" },
        merchant_name: { type: "string" },
        limit: { type: "number", description: "Máximo de resultados (padrão 20, máximo 50)" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_account_balances",
    description:
      "Retorna o saldo calculado atual de cada conta ativa e o total gasto no mês atual em cada cartão de crédito ativo.",
    input_schema: { type: "object" as const, properties: {} },
  },
];

async function resolveIds(
  supabase: Client,
  table: "categories" | "merchants",
  nameColumn: "name" | "display_name",
  needle: unknown,
): Promise<string[] | null> {
  if (typeof needle !== "string" || !needle.trim()) return null;
  const { data } = await supabase.from(table).select("id").ilike(nameColumn, `%${needle.trim()}%`);
  return (data ?? []).map((row) => row.id);
}

const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

async function getTransactionsSummary(supabase: Client, input: Record<string, unknown>) {
  const startDate = String(input.start_date ?? "");
  const endDate = String(input.end_date ?? "");
  if (!startDate || !endDate) return { error: "start_date e end_date são obrigatórios." };

  const categoryIds = await resolveIds(supabase, "categories", "name", input.category_name);
  const merchantIds = await resolveIds(supabase, "merchants", "display_name", input.merchant_name);

  let query = supabase
    .from("transactions")
    .select("amount, type, category_id, merchant_id")
    .gte("date", startDate)
    .lte("date", endDate);

  if (input.type === "receita" || input.type === "despesa") query = query.eq("type", input.type);
  if (categoryIds) query = query.in("category_id", categoryIds.length ? categoryIds : [NO_MATCH_ID]);
  if (merchantIds) query = query.in("merchant_id", merchantIds.length ? merchantIds : [NO_MATCH_ID]);

  const { data: transactions } = await query;
  const rows = transactions ?? [];

  const [{ data: categories }, { data: merchants }] = await Promise.all([
    supabase.from("categories").select("id, name"),
    supabase.from("merchants").select("id, display_name"),
  ]);
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const merchantNameById = new Map((merchants ?? []).map((m) => [m.id, m.display_name]));

  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();
  let total = 0;
  for (const t of rows) {
    total += t.amount;
    const categoryName = t.category_id ? (categoryNameById.get(t.category_id) ?? "Sem categoria") : "Sem categoria";
    byCategory.set(categoryName, (byCategory.get(categoryName) ?? 0) + t.amount);
    if (t.merchant_id) {
      const merchantName = merchantNameById.get(t.merchant_id) ?? "—";
      byMerchant.set(merchantName, (byMerchant.get(merchantName) ?? 0) + t.amount);
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    total: round(total),
    count: rows.length,
    by_category: Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, total: round(value) }))
      .sort((a, b) => b.total - a.total),
    by_merchant: Array.from(byMerchant.entries())
      .map(([name, value]) => ({ name, total: round(value) }))
      .sort((a, b) => b.total - a.total),
  };
}

async function listTransactions(supabase: Client, input: Record<string, unknown>) {
  const startDate = String(input.start_date ?? "");
  const endDate = String(input.end_date ?? "");
  if (!startDate || !endDate) return { error: "start_date e end_date são obrigatórios." };
  const limit = Math.min(Number(input.limit) || 20, 50);

  const categoryIds = await resolveIds(supabase, "categories", "name", input.category_name);
  const merchantIds = await resolveIds(supabase, "merchants", "display_name", input.merchant_name);

  let query = supabase
    .from("transactions")
    .select("date, amount, type, friendly_description, category_id, merchant_id")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false })
    .limit(limit);

  if (input.type === "receita" || input.type === "despesa") query = query.eq("type", input.type);
  if (categoryIds) query = query.in("category_id", categoryIds.length ? categoryIds : [NO_MATCH_ID]);
  if (merchantIds) query = query.in("merchant_id", merchantIds.length ? merchantIds : [NO_MATCH_ID]);

  const { data: transactions } = await query;
  const rows = transactions ?? [];

  const [{ data: categories }, { data: merchants }] = await Promise.all([
    supabase.from("categories").select("id, name"),
    supabase.from("merchants").select("id, display_name"),
  ]);
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const merchantNameById = new Map((merchants ?? []).map((m) => [m.id, m.display_name]));

  return rows.map((t) => ({
    date: t.date,
    description: t.friendly_description ?? "",
    amount: t.amount,
    type: t.type,
    category: t.category_id ? (categoryNameById.get(t.category_id) ?? null) : null,
    merchant: t.merchant_id ? (merchantNameById.get(t.merchant_id) ?? null) : null,
  }));
}

async function getAccountBalances(supabase: Client) {
  const [{ data: accounts }, { data: creditCards }, { data: allTransactions }] = await Promise.all([
    supabase.from("accounts").select("id, name, initial_balance").eq("status", "ativa"),
    supabase.from("credit_cards").select("id, name").eq("status", "ativo"),
    supabase.from("transactions").select("account_id, credit_card_id, amount, type, date"),
  ]);

  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const round = (n: number) => Math.round(n * 100) / 100;

  const accountBalances = (accounts ?? []).map((account) => {
    const txs = (allTransactions ?? []).filter((t) => t.account_id === account.id);
    return { name: account.name, type: "conta" as const, balance: round(computeCalculatedBalance(txs, account.initial_balance)) };
  });

  const cardTotals = (creditCards ?? []).map((card) => {
    const txs = (allTransactions ?? []).filter((t) => t.credit_card_id === card.id && t.date >= monthStart);
    return { name: card.name, type: "cartao" as const, balance: round(-computeCalculatedBalance(txs, 0)) };
  });

  return [...accountBalances, ...cardTotals];
}

export async function runAssistantTool(supabase: Client, name: string, input: Record<string, unknown>): Promise<unknown> {
  if (name === "get_transactions_summary") return getTransactionsSummary(supabase, input);
  if (name === "list_transactions") return listTransactions(supabase, input);
  if (name === "get_account_balances") return getAccountBalances(supabase);
  return { error: `Ferramenta desconhecida: ${name}` };
}
