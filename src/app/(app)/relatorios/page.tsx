import { createClient } from "@/lib/supabase/server";
import { ReportsFilters } from "@/components/reports/reports-filters";
import { ExportButtons } from "@/components/reports/export-buttons";
import { CategoryBarChart } from "@/components/dashboard/category-bar-chart";
import { MonthlyComparisonChart } from "@/components/reports/monthly-comparison-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { foldIntoOther } from "@/lib/dashboard/compute";
import {
  computeSummary,
  computeBreakdownByCategory,
  computeBreakdownByMerchant,
  computeBreakdownByCostCenter,
  computeBreakdownByAccount,
  computeBreakdownByCard,
  computeMonthlyComparison,
  type ReportTransaction,
} from "@/lib/reports-compute";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import type { Database } from "@/types/database";

type SearchParams = Record<string, string | string[] | undefined>;
type TransactionType = Database["public"]["Tables"]["transactions"]["Row"]["type"];

function isTransactionType(value: string): value is TransactionType {
  return value in TRANSACTION_TYPE_LABELS;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().slice(0, 10);
  const defaultEnd = today.toISOString().slice(0, 10);

  const start = firstValue(params.start) || defaultStart;
  const end = firstValue(params.end) || defaultEnd;
  const accountId = firstValue(params.account_id);
  const creditCardId = firstValue(params.credit_card_id);
  const categoryId = firstValue(params.category_id);
  const costCenterId = firstValue(params.cost_center_id);
  const merchantId = firstValue(params.merchant_id);
  const type = firstValue(params.type);

  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select("id, date, amount, type, friendly_description, category_id, merchant_id, account_id, credit_card_id, cost_center_id")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (accountId) query = query.eq("account_id", accountId);
  if (creditCardId) query = query.eq("credit_card_id", creditCardId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (costCenterId) query = query.eq("cost_center_id", costCenterId);
  if (merchantId) query = query.eq("merchant_id", merchantId);
  if (type && isTransactionType(type)) query = query.eq("type", type);

  const [
    { data: transactions },
    { data: accounts },
    { data: creditCards },
    { data: categories },
    { data: costCenters },
    { data: merchants },
  ] = await Promise.all([
    query,
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("credit_cards").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("cost_centers").select("id, name").order("name"),
    supabase.from("merchants").select("id, display_name").order("display_name"),
  ]);

  const rows: ReportTransaction[] = transactions ?? [];

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const merchantNameById = new Map((merchants ?? []).map((m) => [m.id, m.display_name]));
  const costCenterNameById = new Map((costCenters ?? []).map((c) => [c.id, c.name]));
  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const cardNameById = new Map((creditCards ?? []).map((c) => [c.id, c.name]));

  const summary = computeSummary(rows);
  const despesas = rows.filter((t) => t.type === "despesa");
  const receitas = rows.filter((t) => t.type === "receita");

  const byReceitaCategory = foldIntoOther(computeBreakdownByCategory(receitas, categoryNameById), 8);
  const byCategory = foldIntoOther(computeBreakdownByCategory(despesas, categoryNameById), 8);
  const byMerchant = foldIntoOther(computeBreakdownByMerchant(despesas, merchantNameById), 8);
  const byCostCenter = foldIntoOther(computeBreakdownByCostCenter(despesas, costCenterNameById), 8);
  const byOrigin = foldIntoOther(
    [...computeBreakdownByAccount(despesas, accountNameById), ...computeBreakdownByCard(despesas, cardNameById)].filter(
      (entry) => entry.name !== "Sem conta" && entry.name !== "Sem cartão",
    ),
    8,
  );
  const monthly = computeMonthlyComparison(rows);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Análises por período, categoria, empresa, conta ou cartão, com exportação.
          </p>
        </div>
        <ExportButtons defaultStart={start} defaultEnd={end} />
      </div>

      <ReportsFilters
        accounts={accounts ?? []}
        creditCards={creditCards ?? []}
        categories={categories ?? []}
        costCenters={costCenters ?? []}
        merchants={(merchants ?? []).map((m) => ({ id: m.id, name: m.display_name }))}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Receitas</div>
            <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalReceitas)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Despesas</div>
            <div className="text-xl font-semibold text-destructive">{formatCurrency(summary.totalDespesas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Saldo</div>
            <div className={`text-xl font-semibold ${summary.saldo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {formatCurrency(summary.saldo)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Transações</div>
            <div className="text-xl font-semibold">{summary.qtdTransacoes}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receitas x despesas por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyComparisonChart data={monthly} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {byReceitaCategory.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Sem receitas no período.</p>
            ) : (
              <CategoryBarChart data={byReceitaCategory} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={byCategory} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={byMerchant} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por centro de custo</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={byCostCenter} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por conta / cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={byOrigin} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
