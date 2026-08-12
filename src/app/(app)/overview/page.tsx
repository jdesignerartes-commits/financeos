import { createClient } from "@/lib/supabase/server";
import { checkAndCreateNotifications } from "@/lib/actions/notifications";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { CategoryBarChart } from "@/components/dashboard/category-bar-chart";
import { EvolutionChart } from "@/components/dashboard/evolution-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeTotals,
  computeMaiorGasto,
  computeCategoryBreakdown,
  computeReceitaCategoryBreakdown,
  computeMerchantBreakdown,
  computeCardUsage,
  computeAccountActivity,
  computeDailyEvolution,
  foldIntoOther,
  type DashboardTransaction,
} from "@/lib/dashboard/compute";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await checkAndCreateNotifications();

  const params = await searchParams;
  const month = firstValue(params.month) || new Date().toISOString().slice(0, 7);
  const accountId = firstValue(params.account_id);
  const creditCardId = firstValue(params.credit_card_id);
  const categoryId = firstValue(params.category_id);

  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const endDate = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

  const previousMonthNumber = monthNumber === 1 ? 12 : monthNumber - 1;
  const previousYear = monthNumber === 1 ? year - 1 : year;
  const previousStart = `${previousYear}-${String(previousMonthNumber).padStart(2, "0")}-01`;
  const previousEnd = new Date(previousYear, previousMonthNumber, 0).toISOString().slice(0, 10);

  const supabase = await createClient();

  const baseSelect = "id, date, amount, type, friendly_description, category_id, merchant_id, account_id, credit_card_id";

  let currentQuery = supabase.from("transactions").select(baseSelect).gte("date", startDate).lte("date", endDate);
  let previousQuery = supabase
    .from("transactions")
    .select(baseSelect)
    .gte("date", previousStart)
    .lte("date", previousEnd);

  if (accountId) {
    currentQuery = currentQuery.eq("account_id", accountId);
    previousQuery = previousQuery.eq("account_id", accountId);
  }
  if (creditCardId) {
    currentQuery = currentQuery.eq("credit_card_id", creditCardId);
    previousQuery = previousQuery.eq("credit_card_id", creditCardId);
  }
  if (categoryId) {
    currentQuery = currentQuery.eq("category_id", categoryId);
    previousQuery = previousQuery.eq("category_id", categoryId);
  }

  const [
    { data: currentRows },
    { data: previousRows },
    { data: accounts },
    { data: creditCards },
    { data: categories },
    { data: merchants },
    { data: lastImport },
  ] = await Promise.all([
    currentQuery,
    previousQuery,
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("credit_cards").select("id, name").order("name"),
    supabase.from("categories").select("id, name, color").order("sort_order"),
    supabase.from("merchants").select("id, display_name"),
    supabase
      .from("imported_files")
      .select("file_name, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const toTransactions = (rows: typeof currentRows): DashboardTransaction[] =>
    (rows ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      amount: r.amount,
      type: r.type,
      description: r.friendly_description ?? "",
      category_id: r.category_id,
      merchant_id: r.merchant_id,
      account_id: r.account_id,
      credit_card_id: r.credit_card_id,
    }));

  const currentTx = toTransactions(currentRows);
  const previousTx = toTransactions(previousRows);

  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const creditCardNameById = new Map((creditCards ?? []).map((c) => [c.id, c.name]));
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const categoryColorById = new Map(
    (categories ?? []).filter((c) => c.color).map((c) => [c.id, c.color as string]),
  );
  const merchantNameById = new Map((merchants ?? []).map((m) => [m.id, m.display_name]));

  const totals = computeTotals(currentTx);
  const previousTotals = computeTotals(previousTx);
  const maiorGasto = computeMaiorGasto(currentTx);
  const categoryBreakdown = computeCategoryBreakdown(currentTx, categoryNameById, categoryColorById);
  const receitaCategoryBreakdown = computeReceitaCategoryBreakdown(currentTx, categoryNameById, categoryColorById);
  const merchantBreakdown = computeMerchantBreakdown(currentTx, merchantNameById);
  const cardUsage = computeCardUsage(currentTx, creditCardNameById);
  const accountActivity = computeAccountActivity(currentTx, accountNameById);
  const dailyEvolution = computeDailyEvolution(currentTx, year, monthNumber);
  const categoryChartData = foldIntoOther(categoryBreakdown, 8);
  const receitaCategoryChartData = foldIntoOther(receitaCategoryBreakdown, 8);

  const hasAnyData = currentTx.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            {hasAnyData
              ? "Indicadores, gráficos e comparativos do período selecionado."
              : "Nenhuma movimentação neste período. Envie seus documentos em Importações ou ajuste o filtro."}
          </p>
        </div>
      </div>

      <DashboardFilters accounts={accounts ?? []} creditCards={creditCards ?? []} categories={categories ?? []} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Receitas"
          value={formatCurrency(totals.totalReceitas)}
          delta={{ percent: percentDelta(totals.totalReceitas, previousTotals.totalReceitas), label: "vs mês anterior" }}
          deltaGoodDirection="up"
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(totals.totalDespesas)}
          delta={{ percent: percentDelta(totals.totalDespesas, previousTotals.totalDespesas), label: "vs mês anterior" }}
          deltaGoodDirection="down"
        />
        <StatCard
          label="Saldo"
          value={formatCurrency(totals.saldo)}
          delta={{ percent: percentDelta(totals.saldo, previousTotals.saldo), label: "vs mês anterior" }}
          deltaGoodDirection="up"
        />
        <StatCard label="Economia do período" value={`${totals.economiaPercent.toFixed(1)}%`} />
        <StatCard label="Transações" value={String(totals.qtdTransacoes)} />
        <StatCard label="Ticket médio" value={formatCurrency(totals.ticketMedio)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={categoryChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {receitaCategoryChartData.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Sem receitas no período.</p>
            ) : (
              <CategoryBarChart data={receitaCategoryChartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução diária — receitas x despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <EvolutionChart data={dailyEvolution} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Maior gasto"
          value={maiorGasto ? formatCurrency(maiorGasto.amount) : "—"}
        />
        <StatCard label="Maior categoria" value={categoryBreakdown[0]?.name ?? "—"} />
        <StatCard label="Maior estabelecimento" value={merchantBreakdown[0]?.name ?? "—"} />
        <StatCard label="Cartão mais utilizado" value={cardUsage[0]?.name ?? "—"} />
        <StatCard label="Conta mais movimentada" value={accountActivity[0]?.name ?? "—"} />
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Última importação: {lastImport ? `${lastImport.file_name} — ${new Date(lastImport.created_at).toLocaleString("pt-BR")}` : "nenhuma ainda"}
        </CardContent>
      </Card>
    </div>
  );
}
