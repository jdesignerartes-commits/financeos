import { createClient } from "@/lib/supabase/server";
import { deleteTransaction } from "@/lib/actions/transactions";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import type { Database } from "@/types/database";

type TransactionType = Database["public"]["Tables"]["transactions"]["Row"]["type"];
type SearchParams = Record<string, string | string[] | undefined>;

function isTransactionType(value: string): value is TransactionType {
  return value in TRANSACTION_TYPE_LABELS;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const month = firstValue(params.month) || new Date().toISOString().slice(0, 7);
  const accountId = firstValue(params.account_id);
  const creditCardId = firstValue(params.credit_card_id);
  const categoryId = firstValue(params.category_id);
  const type = firstValue(params.type);

  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const endDate = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (accountId) query = query.eq("account_id", accountId);
  if (creditCardId) query = query.eq("credit_card_id", creditCardId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (type && isTransactionType(type)) query = query.eq("type", type);

  const [
    { data: transactions },
    { data: accounts },
    { data: creditCards },
    { data: categories },
    { data: subcategories },
    { data: merchants },
    { data: costCenters },
  ] = await Promise.all([
    query,
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("credit_cards").select("id, name").order("name"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("subcategories").select("*").order("name"),
    supabase.from("merchants").select("id, display_name").order("display_name"),
    supabase.from("cost_centers").select("id, name").order("name"),
  ]);

  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const creditCardNameById = new Map((creditCards ?? []).map((c) => [c.id, c.name]));
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const merchantNameById = new Map((merchants ?? []).map((m) => [m.id, m.display_name]));

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");

  const total = (transactions ?? []).reduce(
    (acc, t) => acc + (t.type === "receita" ? t.amount : t.type === "despesa" ? -t.amount : 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">Cadastro manual, listagem, filtros e edição.</p>
        </div>
        <TransactionDialog
          accounts={accounts ?? []}
          creditCards={creditCards ?? []}
          categories={categories ?? []}
          subcategories={subcategories ?? []}
          merchants={merchants ?? []}
          costCenters={costCenters ?? []}
        />
      </div>

      <TransactionsFilters accounts={accounts ?? []} creditCards={creditCards ?? []} categories={categories ?? []} />

      <Card>
        <CardContent className="p-0">
          {!transactions?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhuma transação neste período. Clique em &quot;Nova transação&quot; para lançar a primeira.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta / Cartão</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions ?? []).map((transaction) => {
                  const category = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
                  const isIncome = transaction.type === "receita";
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{transaction.friendly_description}</div>
                        {transaction.merchant_id && (
                          <div className="text-xs text-muted-foreground">
                            {merchantNameById.get(transaction.merchant_id)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {category ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: category.color ?? "#94a3b8" }}
                            />
                            {category.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.credit_card_id
                          ? creditCardNameById.get(transaction.credit_card_id)
                          : transaction.account_id
                            ? accountNameById.get(transaction.account_id)
                            : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{TRANSACTION_TYPE_LABELS[transaction.type]}</Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${isIncome ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <TransactionDialog
                            transaction={transaction}
                            accounts={accounts ?? []}
                            creditCards={creditCards ?? []}
                            categories={categories ?? []}
                            subcategories={subcategories ?? []}
                            merchants={merchants ?? []}
                            costCenters={costCenters ?? []}
                          />
                          <DeleteButton
                            action={deleteTransaction.bind(null, transaction.id)}
                            confirmMessage={`Excluir a transação "${transaction.friendly_description}"?`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <tfoot>
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Saldo do período
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${total >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                  >
                    {formatCurrency(total)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
