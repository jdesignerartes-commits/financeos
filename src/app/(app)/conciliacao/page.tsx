import { createClient } from "@/lib/supabase/server";
import { computeCalculatedBalance } from "@/lib/reconciliation-compute";
import { ReconciliationFilters } from "@/components/reconciliation/reconciliation-filters";
import { StatementBalanceForm } from "@/components/reconciliation/statement-balance-form";
import { DetectReconciliationButton } from "@/components/reconciliation/detect-reconciliation-button";
import { NewReconciliationDialog } from "@/components/reconciliation/new-reconciliation-dialog";
import { IconActionButton } from "@/components/shared/icon-action-button";
import { DeleteButton } from "@/components/shared/delete-button";
import { setReconciliationStatus, deleteReconciliationItem } from "@/lib/actions/reconciliation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { RECONCILIATION_TYPE_LABELS, RECONCILIATION_STATUS_LABELS } from "@/lib/labels";
import type { Database } from "@/types/database";

type SearchParams = Record<string, string | string[] | undefined>;
type ReconciliationItem = Database["public"]["Tables"]["reconciliation_items"]["Row"];
type LinkedTransaction = {
  id: string;
  date: string;
  amount: number;
  type: string;
  friendly_description: string | null;
  account_id: string | null;
  credit_card_id: string | null;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");

export default async function ConciliacaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: accounts }, { data: creditCards }] = await Promise.all([
    supabase.from("accounts").select("id, name, initial_balance").eq("status", "ativa").order("name"),
    supabase.from("credit_cards").select("id, name").eq("status", "ativo").order("name"),
  ]);

  const defaultTarget = accounts?.[0]
    ? `account:${accounts[0].id}`
    : creditCards?.[0]
      ? `card:${creditCards[0].id}`
      : null;

  const target = firstValue(params.target) || defaultTarget;

  if (!target) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conciliação</h1>
          <p className="text-sm text-muted-foreground">
            Compare o saldo calculado pelo sistema com o extrato e resolva pendências.
          </p>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Cadastre uma conta ou cartão para começar a conciliar.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [kind, targetId] = target.split(":") as ["account" | "card", string];
  const dbKind: "account" | "credit_card" = kind === "card" ? "credit_card" : "account";
  const month = firstValue(params.month) || new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const endDate = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

  const balanceQuery =
    kind === "account"
      ? supabase
          .from("transactions")
          .select("id, date, amount, type, account_id, credit_card_id, friendly_description")
          .eq("account_id", targetId)
          .lte("date", endDate)
      : supabase
          .from("transactions")
          .select("id, date, amount, type, account_id, credit_card_id, friendly_description")
          .eq("credit_card_id", targetId)
          .gte("date", startDate)
          .lte("date", endDate);

  const statementQuery = supabase
    .from("statement_balances")
    .select("informed_balance")
    .eq(kind === "account" ? "account_id" : "credit_card_id", targetId)
    .eq("period_year", year)
    .eq("period_month", monthNumber)
    .maybeSingle();

  const [
    { data: balanceTransactions },
    { data: statementBalance },
    { data: pendingItems },
    { data: resolvedItems },
    { data: recentTransactions },
  ] = await Promise.all([
    balanceQuery,
    statementQuery,
    supabase
      .from("reconciliation_items")
      .select("*")
      .eq("status", "pendente")
      .order("created_at", { ascending: false }),
    supabase
      .from("reconciliation_items")
      .select("*")
      .in("status", ["confirmado", "rejeitado"])
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("transactions")
      .select("id, date, amount, type, friendly_description")
      .order("date", { ascending: false })
      .limit(200),
  ]);

  const account = accounts?.find((a) => a.id === targetId);
  const initialBalance = kind === "account" ? (account?.initial_balance ?? 0) : 0;
  const calculatedBalanceRaw = computeCalculatedBalance(balanceTransactions ?? [], initialBalance);
  const calculatedBalance = kind === "card" ? -calculatedBalanceRaw : calculatedBalanceRaw;
  const informedBalance = statementBalance?.informed_balance ?? null;
  const difference = informedBalance != null ? informedBalance - calculatedBalance : null;

  const allItems = [...(pendingItems ?? []), ...(resolvedItems ?? [])];
  const linkedIds = Array.from(
    new Set(allItems.flatMap((item) => [item.transaction_id, item.related_transaction_id].filter(Boolean) as string[])),
  );

  const [{ data: linkedTransactions }, { data: allAccounts }, { data: allCards }] = await Promise.all([
    linkedIds.length
      ? supabase
          .from("transactions")
          .select("id, date, amount, type, friendly_description, account_id, credit_card_id")
          .in("id", linkedIds)
      : Promise.resolve({ data: [] as LinkedTransaction[] }),
    supabase.from("accounts").select("id, name"),
    supabase.from("credit_cards").select("id, name"),
  ]);

  const accountNameById = new Map((allAccounts ?? []).map((a) => [a.id, a.name]));
  const cardNameById = new Map((allCards ?? []).map((c) => [c.id, c.name]));
  const transactionById = new Map((linkedTransactions ?? []).map((t) => [t.id, t]));

  function describeTransaction(id: string | null) {
    if (!id) return "—";
    const t = transactionById.get(id);
    if (!t) return "—";
    const origin = t.account_id
      ? accountNameById.get(t.account_id)
      : t.credit_card_id
        ? cardNameById.get(t.credit_card_id)
        : null;
    return `${formatDate(t.date)} · ${t.friendly_description ?? "Sem descrição"} · ${formatCurrency(t.amount)}${origin ? ` · ${origin}` : ""}`;
  }

  const transactionOptions = (recentTransactions ?? []).map((t) => ({
    value: t.id,
    label: `${formatDate(t.date)} · ${t.friendly_description ?? "Sem descrição"} · ${formatCurrency(t.amount)}`,
  }));

  function renderItemRow(item: ReconciliationItem, resolved: boolean) {
    return (
      <div key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{RECONCILIATION_TYPE_LABELS[item.type]}</Badge>
            {resolved && (
              <Badge variant={item.status === "confirmado" ? "default" : "outline"}>
                {RECONCILIATION_STATUS_LABELS[item.status]}
              </Badge>
            )}
          </div>
          <div className="text-sm">{describeTransaction(item.transaction_id)}</div>
          {item.related_transaction_id && (
            <div className="text-sm text-muted-foreground">↳ {describeTransaction(item.related_transaction_id)}</div>
          )}
          {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!resolved && (
            <>
              <IconActionButton
                label="Confirmar"
                action={setReconciliationStatus.bind(null, item.id, "confirmado")}
              >
                <Check className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton label="Rejeitar" action={setReconciliationStatus.bind(null, item.id, "rejeitado")}>
                <X className="h-4 w-4" />
              </IconActionButton>
            </>
          )}
          <DeleteButton
            action={deleteReconciliationItem.bind(null, item.id)}
            confirmMessage="Excluir esta pendência de conciliação?"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conciliação</h1>
          <p className="text-sm text-muted-foreground">
            Compare o saldo calculado pelo sistema com o extrato e resolva pendências.
          </p>
        </div>
        <ReconciliationFilters
          accounts={accounts ?? []}
          creditCards={creditCards ?? []}
          defaultTarget={defaultTarget ?? ""}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{kind === "account" ? "Saldo da conta" : "Total da fatura"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-xs text-muted-foreground">Saldo calculado pelo sistema</div>
              <div className="text-xl font-semibold">{formatCurrency(calculatedBalance)}</div>
            </div>
            {difference != null && (
              <div>
                <div className="text-xs text-muted-foreground">Diferença</div>
                <div
                  className={`text-xl font-semibold ${Math.abs(difference) < 0.01 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                >
                  {formatCurrency(difference)}
                </div>
              </div>
            )}
          </div>
          <StatementBalanceForm
            targetType={dbKind}
            targetId={targetId}
            period={month}
            informedBalance={informedBalance}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Pendências de conciliação</CardTitle>
          <div className="flex gap-2">
            <DetectReconciliationButton />
            <NewReconciliationDialog transactionOptions={transactionOptions} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!pendingItems?.length ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma pendência de conciliação no momento.</p>
          ) : (
            <div className="divide-y">{pendingItems.map((item) => renderItemRow(item, false))}</div>
          )}
        </CardContent>
      </Card>

      {!!resolvedItems?.length && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Resolvidas recentemente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">{resolvedItems.map((item) => renderItemRow(item, true))}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
