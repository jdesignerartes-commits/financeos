"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const INSIGHTS_TOOL = {
  name: "write_insights",
  description: "Registra a lista de insights financeiros gerados a partir dos dados fornecidos.",
  input_schema: {
    type: "object" as const,
    properties: {
      insights: {
        type: "array",
        items: { type: "string" },
        description: "De 3 a 5 insights curtos, cada um uma frase completa em português.",
      },
    },
    required: ["insights"],
  },
};

export async function generateInsights(): Promise<{ error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Análises não configuradas: falta ANTHROPIC_API_KEY no servidor." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10);
  const periodEnd = today.toISOString().slice(0, 10);
  const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: transactions }, { data: categories }, { data: budgets }, { data: subscriptions }, { data: goals }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("date, amount, type, category_id")
        .gte("date", periodStart)
        .lte("date", periodEnd),
      supabase.from("categories").select("id, name"),
      supabase
        .from("budgets")
        .select("limit_amount, category_id")
        .eq("period_year", today.getFullYear())
        .eq("period_month", today.getMonth() + 1),
      supabase.from("subscriptions").select("name, current_amount, frequency").eq("status", "ativa"),
      supabase.from("financial_goals").select("name, current_amount, target_amount").eq("status", "em_andamento"),
    ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const round = (n: number) => Math.round(n * 100) / 100;

  const monthly = new Map<string, { receita: number; despesa: number }>();
  const currentMonthCategory = new Map<string, number>();
  for (const t of transactions ?? []) {
    const monthKey = t.date.slice(0, 7);
    const entry = monthly.get(monthKey) ?? { receita: 0, despesa: 0 };
    if (t.type === "receita") entry.receita += t.amount;
    else if (t.type === "despesa") entry.despesa += t.amount;
    monthly.set(monthKey, entry);

    if (t.type === "despesa" && t.date >= currentMonthStart) {
      const name = t.category_id ? (categoryNameById.get(t.category_id) ?? "Sem categoria") : "Sem categoria";
      currentMonthCategory.set(name, (currentMonthCategory.get(name) ?? 0) + t.amount);
    }
  }

  const budgetSummaries = (budgets ?? []).map((budget) => {
    const used = (transactions ?? [])
      .filter((t) => t.type === "despesa" && t.date >= currentMonthStart && t.category_id === budget.category_id)
      .reduce((acc, t) => acc + t.amount, 0);
    const name = budget.category_id ? (categoryNameById.get(budget.category_id) ?? "—") : "—";
    return {
      categoria: name,
      limite: budget.limit_amount,
      usado: round(used),
      percentual: budget.limit_amount > 0 ? Math.round((used / budget.limit_amount) * 100) : 0,
    };
  });

  const summary = {
    mes_atual: currentMonthStart.slice(0, 7),
    evolucao_mensal: Array.from(monthly.entries())
      .map(([mes, v]) => ({ mes, receitas: round(v.receita), despesas: round(v.despesa) }))
      .sort((a, b) => a.mes.localeCompare(b.mes)),
    despesas_por_categoria_mes_atual: Array.from(currentMonthCategory.entries())
      .map(([nome, total]) => ({ nome, total: round(total) }))
      .sort((a, b) => b.total - a.total),
    orcamentos_mes_atual: budgetSummaries,
    assinaturas_ativas: (subscriptions ?? []).map((s) => ({ nome: s.name, valor: s.current_amount, frequencia: s.frequency })),
    metas_em_andamento: (goals ?? []).map((g) => ({
      nome: g.name,
      atual: g.current_amount,
      meta: g.target_amount,
      percentual: g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0,
    })),
  };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      tools: [INSIGHTS_TOOL],
      tool_choice: { type: "tool", name: "write_insights" },
      messages: [
        {
          role: "user",
          content: `Você é um analista financeiro pessoal. Com base SOMENTE nestes dados reais do usuário (não invente números fora deles), escreva de 3 a 5 insights curtos, específicos e acionáveis em português sobre a situação financeira do mês atual — tendências, riscos (ex.: orçamento perto de estourar, categoria crescendo) e oportunidades de economia. Cite um número concreto dos dados em cada insight quando fizer sentido.\n\nDados:\n${JSON.stringify(summary)}`,
        },
      ],
    });
  } catch (error) {
    return { error: error instanceof Error ? `Falha ao gerar análise: ${error.message}` : "Falha ao gerar análise." };
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { error: "A IA não retornou um resultado estruturado." };
  }

  const payload = toolUse.input as { insights?: unknown };
  const insights = Array.isArray(payload.insights)
    ? payload.insights.filter((item): item is string => typeof item === "string")
    : [];

  if (insights.length === 0) {
    return { error: "Nenhum insight foi gerado." };
  }

  const { error } = await supabase.from("ai_insights").insert({
    user_id: user.id,
    period_start: periodStart,
    period_end: periodEnd,
    insight_type: "mensal",
    content: insights.join("\n"),
    data: summary,
  });

  if (error) {
    return { error: "Não foi possível salvar a análise gerada." };
  }

  revalidatePath("/analises");
  return {};
}
