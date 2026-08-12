import { createClient } from "@/lib/supabase/server";
import { checkAndCreateNotifications } from "@/lib/actions/notifications";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { EvolutionChart } from "@/components/dashboard/evolution-chart";
import {
  BigNumber,
  BreakdownList,
  HighlightGrid,
  Label,
  Metric,
  MetricRow,
  MINIMAL,
  MinimalPage,
  Section,
  formatBRL,
  percentDelta,
} from "@/components/minimal/primitives";
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

  const baseSelect =
    "id, date, amount, type, friendly_description, category_id, merchant_id, account_id, credit_card_id";

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
  const categoryChartData = foldIntoOther(categoryBreakdown, 6);
  const receitaCategoryChartData = foldIntoOther(receitaCategoryBreakdown, 5);

  const hasAnyData = currentTx.length > 0;
  const saldoDelta = totals.saldo - previousTotals.saldo;

  return (
    <MinimalPage>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label>Visão geral</Label>
          <p className="max-w-[52ch] text-sm" style={{ color: MINIMAL.body }}>
            {hasAnyData
              ? "Indicadores, gráficos e comparativos do período selecionado."
              : "Nenhuma movimentação neste período. Envie seus documentos em Importações ou ajuste o filtro."}
          </p>
        </div>
        <DashboardFilters accounts={accounts ?? []} creditCards={creditCards ?? []} categories={categories ?? []} />
      </div>

      <section className="flex flex-wrap items-end gap-12">
        <div className="flex min-w-[320px] flex-1 flex-col gap-3">
          <Label>Saldo do período</Label>
          <BigNumber>{formatBRL(totals.saldo, true)}</BigNumber>
          <div className="flex items-center gap-[10px] text-[13px]" style={{ color: MINIMAL.body }}>
            <span style={{ color: saldoDelta >= 0 ? MINIMAL.green : MINIMAL.negative, fontWeight: 500 }}>
              {saldoDelta >= 0 ? "+ " : "− "}
              {formatBRL(Math.abs(saldoDelta), true)}
            </span>
            <span className="h-3 w-px" style={{ background: "#d9d9d1" }} />
            <span>em relação ao mês anterior</span>
          </div>
        </div>

        <div className="min-w-[320px] flex-1">
          <MetricRow>
            <Metric
              label="Receitas"
              value={formatBRL(totals.totalReceitas)}
              delta={percentDelta(totals.totalReceitas, previousTotals.totalReceitas)}
              goodDirection="up"
            />
            <Metric
              label="Despesas"
              value={formatBRL(totals.totalDespesas)}
              delta={percentDelta(totals.totalDespesas, previousTotals.totalDespesas)}
              goodDirection="down"
            />
            <Metric label="Economia" value={`${totals.economiaPercent.toFixed(1)}%`} highlight />
          </MetricRow>
        </div>
      </section>

      <Section
        title="Evolução diária"
        aside={
          <div className="flex gap-[18px] font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: MINIMAL.muted }}>
            <span>{totals.qtdTransacoes} transações</span>
            <span>ticket médio {formatBRL(totals.ticketMedio)}</span>
          </div>
        }
      >
        <EvolutionChart data={dailyEvolution} />
      </Section>

      <div className="grid gap-12 lg:grid-cols-2">
        <Section title="Gastos por categoria">
          <BreakdownList data={categoryChartData} empty="Sem despesas no período." />
        </Section>
        <Section title="Receitas por categoria">
          <BreakdownList data={receitaCategoryChartData} empty="Sem receitas no período." />
        </Section>
      </div>

      <Section title="Destaques do período">
        <HighlightGrid
          items={[
            { label: "Maior gasto", value: maiorGasto ? formatBRL(maiorGasto.amount) : "—" },
            { label: "Maior categoria", value: categoryBreakdown[0]?.name ?? "—" },
            { label: "Maior estabelecimento", value: merchantBreakdown[0]?.name ?? "—" },
            { label: "Cartão mais utilizado", value: cardUsage[0]?.name ?? "—" },
            { label: "Conta mais movimentada", value: accountActivity[0]?.name ?? "—" },
          ]}
        />
      </Section>

      <p className="font-mono text-[11px]" style={{ color: MINIMAL.muted }}>
        Última importação:{" "}
        {lastImport
          ? `${lastImport.file_name} — ${new Date(lastImport.created_at).toLocaleString("pt-BR")}`
          : "nenhuma ainda"}
      </p>
    </MinimalPage>
  );
}
