export type DashboardTransaction = {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
  category_id: string | null;
  merchant_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
};

export type Totals = {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  economiaPercent: number;
  qtdTransacoes: number;
  ticketMedio: number;
};

export function computeTotals(transactions: DashboardTransaction[]): Totals {
  const receitas = transactions.filter((t) => t.type === "receita");
  const despesas = transactions.filter((t) => t.type === "despesa");

  const totalReceitas = receitas.reduce((acc, t) => acc + t.amount, 0);
  const totalDespesas = despesas.reduce((acc, t) => acc + t.amount, 0);
  const saldo = totalReceitas - totalDespesas;

  return {
    totalReceitas,
    totalDespesas,
    saldo,
    economiaPercent: totalReceitas > 0 ? (saldo / totalReceitas) * 100 : 0,
    qtdTransacoes: receitas.length + despesas.length,
    ticketMedio: despesas.length > 0 ? totalDespesas / despesas.length : 0,
  };
}

export function computeMaiorGasto(transactions: DashboardTransaction[]) {
  const despesas = transactions.filter((t) => t.type === "despesa");
  if (despesas.length === 0) return null;
  return despesas.reduce((max, t) => (t.amount > max.amount ? t : max), despesas[0]);
}

export type BreakdownEntry = { id: string; name: string; total: number; color?: string };

function groupByAndSum(
  transactions: DashboardTransaction[],
  keyOf: (t: DashboardTransaction) => string | null,
  nameById: Map<string, string>,
  fallbackName: string,
): BreakdownEntry[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    const key = keyOf(t) ?? "__none__";
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  return Array.from(totals.entries())
    .map(([id, total]) => ({ id, total, name: id === "__none__" ? fallbackName : nameById.get(id) ?? fallbackName }))
    .sort((a, b) => b.total - a.total);
}

function withColors(entries: BreakdownEntry[], colorById?: Map<string, string>): BreakdownEntry[] {
  if (!colorById) return entries;
  return entries.map((entry) => ({ ...entry, color: colorById.get(entry.id) }));
}

export function computeCategoryBreakdown(
  transactions: DashboardTransaction[],
  categoryNameById: Map<string, string>,
  categoryColorById?: Map<string, string>,
): BreakdownEntry[] {
  const despesas = transactions.filter((t) => t.type === "despesa");
  return withColors(groupByAndSum(despesas, (t) => t.category_id, categoryNameById, "Sem categoria"), categoryColorById);
}

export function computeReceitaCategoryBreakdown(
  transactions: DashboardTransaction[],
  categoryNameById: Map<string, string>,
  categoryColorById?: Map<string, string>,
): BreakdownEntry[] {
  const receitas = transactions.filter((t) => t.type === "receita");
  return withColors(groupByAndSum(receitas, (t) => t.category_id, categoryNameById, "Sem categoria"), categoryColorById);
}

export function computeMerchantBreakdown(
  transactions: DashboardTransaction[],
  merchantNameById: Map<string, string>,
): BreakdownEntry[] {
  const despesas = transactions.filter((t) => t.type === "despesa" && t.merchant_id);
  return groupByAndSum(despesas, (t) => t.merchant_id, merchantNameById, "—");
}

export function computeCardUsage(
  transactions: DashboardTransaction[],
  cardNameById: Map<string, string>,
): BreakdownEntry[] {
  const despesas = transactions.filter((t) => t.type === "despesa" && t.credit_card_id);
  return groupByAndSum(despesas, (t) => t.credit_card_id, cardNameById, "—");
}

export function computeAccountActivity(
  transactions: DashboardTransaction[],
  accountNameById: Map<string, string>,
): BreakdownEntry[] {
  const withAccount = transactions.filter((t) => t.account_id);
  const counts = new Map<string, number>();
  for (const t of withAccount) {
    const key = t.account_id as string;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([id, total]) => ({ id, total, name: accountNameById.get(id) ?? "—" }))
    .sort((a, b) => b.total - a.total);
}

export type DailyPoint = { day: number; receita: number; despesa: number };

export function computeDailyEvolution(
  transactions: DashboardTransaction[],
  year: number,
  month: number,
): DailyPoint[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const points: DailyPoint[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    receita: 0,
    despesa: 0,
  }));

  for (const t of transactions) {
    const day = Number(t.date.slice(8, 10));
    if (!day || day < 1 || day > daysInMonth) continue;
    if (t.type === "receita") points[day - 1].receita += t.amount;
    else if (t.type === "despesa") points[day - 1].despesa += t.amount;
  }

  return points;
}

export function foldIntoOther(entries: BreakdownEntry[], limit: number): BreakdownEntry[] {
  if (entries.length <= limit) return entries;
  const head = entries.slice(0, limit);
  const tailTotal = entries.slice(limit).reduce((acc, e) => acc + e.total, 0);
  return [...head, { id: "__other__", name: "Outros", total: tailTotal }];
}
