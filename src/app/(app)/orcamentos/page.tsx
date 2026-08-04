import { createClient } from "@/lib/supabase/server";
import { deleteBudget } from "@/lib/actions/budgets";
import { BudgetDialog } from "@/components/budgets/budget-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeBudgetProjection, budgetAlertLevel } from "@/lib/budgets-compute";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const ALERT_STYLES: Record<string, { bar: string; badge: "default" | "secondary" | "destructive" }> = {
  ok: { bar: "bg-primary", badge: "default" },
  warning: { bar: "bg-amber-500", badge: "secondary" },
  danger: { bar: "bg-orange-500", badge: "destructive" },
  over: { bar: "bg-destructive", badge: "destructive" },
};

export default async function OrcamentosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const month = firstValue(params.month) || new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const endDate = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

  const supabase = await createClient();

  const [
    { data: budgets },
    { data: categories },
    { data: accounts },
    { data: creditCards },
    { data: costCenters },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from("budgets")
      .select("*")
      .eq("period_year", year)
      .eq("period_month", monthNumber)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name").eq("status", "ativa").order("sort_order"),
    supabase.from("accounts").select("id, name").eq("status", "ativa").order("name"),
    supabase.from("credit_cards").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("cost_centers").select("id, name").eq("status", "ativo").order("name"),
    supabase
      .from("transactions")
      .select("amount, category_id, account_id, credit_card_id, cost_center_id")
      .eq("type", "despesa")
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const creditCardNameById = new Map((creditCards ?? []).map((c) => [c.id, c.name]));
  const costCenterNameById = new Map((costCenters ?? []).map((c) => [c.id, c.name]));

  function targetInfo(budget: NonNullable<typeof budgets>[number]) {
    if (budget.category_id) return { name: categoryNameById.get(budget.category_id) ?? "—", type: "Categoria" };
    if (budget.account_id) return { name: accountNameById.get(budget.account_id) ?? "—", type: "Conta" };
    if (budget.credit_card_id) return { name: creditCardNameById.get(budget.credit_card_id) ?? "—", type: "Cartão" };
    if (budget.cost_center_id) return { name: costCenterNameById.get(budget.cost_center_id) ?? "—", type: "Centro de custo" };
    return { name: "—", type: "—" };
  }

  function usedAmount(budget: NonNullable<typeof budgets>[number]) {
    return (transactions ?? [])
      .filter((t) => {
        if (budget.category_id) return t.category_id === budget.category_id;
        if (budget.account_id) return t.account_id === budget.account_id;
        if (budget.credit_card_id) return t.credit_card_id === budget.credit_card_id;
        if (budget.cost_center_id) return t.cost_center_id === budget.cost_center_id;
        return false;
      })
      .reduce((acc, t) => acc + t.amount, 0);
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Limites mensais por categoria, conta, cartão ou centro de custo.</p>
        </div>
        <BudgetDialog
          categories={categories ?? []}
          accounts={accounts ?? []}
          creditCards={creditCards ?? []}
          costCenters={costCenters ?? []}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {!budgets?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum orçamento definido para este período. Clique em &quot;Novo orçamento&quot; para começar.
            </p>
          ) : (
            <div className="divide-y">
              {budgets.map((budget) => {
                const info = targetInfo(budget);
                const used = usedAmount(budget);
                const percent = (used / budget.limit_amount) * 100;
                const level = budgetAlertLevel(percent);
                const { projected } = computeBudgetProjection(used, budget.period_year, budget.period_month);
                const styles = ALERT_STYLES[level];

                return (
                  <div key={budget.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">{info.name}</div>
                        <div className="text-xs text-muted-foreground">{info.type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={styles.badge}>{percent.toFixed(0)}%</Badge>
                        <BudgetDialog
                          budget={budget}
                          categories={categories ?? []}
                          accounts={accounts ?? []}
                          creditCards={creditCards ?? []}
                          costCenters={costCenters ?? []}
                        />
                        <DeleteButton
                          action={deleteBudget.bind(null, budget.id)}
                          confirmMessage={`Excluir o orçamento de "${info.name}"?`}
                        />
                      </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${styles.bar}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                      <span>
                        {formatCurrency(used)} de {formatCurrency(budget.limit_amount)} · restante{" "}
                        {formatCurrency(Math.max(budget.limit_amount - used, 0))}
                      </span>
                      <span>Projeção até o fim do mês: {formatCurrency(projected)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
