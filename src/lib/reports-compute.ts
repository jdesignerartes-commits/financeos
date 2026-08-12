export type ReportTransaction = {
  id: string;
  date: string;
  amount: number;
  type: string;
  friendly_description: string | null;
  category_id: string | null;
  merchant_id: string | null;
  account_id: string | null;
  credit_card_id: string | null;
  cost_center_id: string | null;
};

export type BreakdownEntry = { id: string; name: string; total: number; color?: string };

function groupByAndSum(
  transactions: ReportTransaction[],
  keyOf: (t: ReportTransaction) => string | null,
  nameById: Map<string, string>,
  fallbackName: string,
): BreakdownEntry[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    const key = keyOf(t) ?? "__none__";
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  return Array.from(totals.entries())
    .map(([id, total]) => ({ id, total, name: id === "__none__" ? fallbackName : (nameById.get(id) ?? fallbackName) }))
    .sort((a, b) => b.total - a.total);
}

export function computeBreakdownByCategory(
  transactions: ReportTransaction[],
  nameById: Map<string, string>,
  colorById?: Map<string, string>,
) {
  const entries = groupByAndSum(transactions, (t) => t.category_id, nameById, "Sem categoria");
  if (!colorById) return entries;
  return entries.map((entry) => ({ ...entry, color: colorById.get(entry.id) }));
}

export function computeBreakdownByMerchant(transactions: ReportTransaction[], nameById: Map<string, string>) {
  return groupByAndSum(transactions, (t) => t.merchant_id, nameById, "Sem empresa");
}

export function computeBreakdownByAccount(transactions: ReportTransaction[], nameById: Map<string, string>) {
  return groupByAndSum(transactions, (t) => t.account_id, nameById, "Sem conta");
}

export function computeBreakdownByCard(transactions: ReportTransaction[], nameById: Map<string, string>) {
  return groupByAndSum(transactions, (t) => t.credit_card_id, nameById, "Sem cartão");
}

export function computeBreakdownByCostCenter(transactions: ReportTransaction[], nameById: Map<string, string>) {
  return groupByAndSum(transactions, (t) => t.cost_center_id, nameById, "Sem centro de custo");
}

export type MonthlyPoint = { month: string; receita: number; despesa: number };

export function computeMonthlyComparison(transactions: ReportTransaction[]): MonthlyPoint[] {
  const totals = new Map<string, { receita: number; despesa: number }>();
  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    const entry = totals.get(key) ?? { receita: 0, despesa: 0 };
    if (t.type === "receita") entry.receita += t.amount;
    else if (t.type === "despesa") entry.despesa += t.amount;
    totals.set(key, entry);
  }
  return Array.from(totals.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export type ReportSummary = {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  qtdTransacoes: number;
};

export function computeSummary(transactions: ReportTransaction[]): ReportSummary {
  const totalReceitas = transactions.filter((t) => t.type === "receita").reduce((acc, t) => acc + t.amount, 0);
  const totalDespesas = transactions.filter((t) => t.type === "despesa").reduce((acc, t) => acc + t.amount, 0);
  return {
    totalReceitas,
    totalDespesas,
    saldo: totalReceitas - totalDespesas,
    qtdTransacoes: transactions.length,
  };
}
