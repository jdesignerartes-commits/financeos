import { createClient } from "@/lib/supabase/server";
import { deleteInstallment } from "@/lib/actions/installments";
import { InstallmentDialog } from "@/components/installments/installment-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeInstallmentProgress } from "@/lib/installments-compute";

export default async function ParcelamentosPage() {
  const supabase = await createClient();
  const [{ data: installments }, { data: creditCards }, { data: categories }] = await Promise.all([
    supabase.from("installments").select("*").order("start_date", { ascending: false }),
    supabase.from("credit_cards").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("categories").select("id, name").eq("status", "ativa").order("sort_order"),
  ]);

  const creditCardNameById = new Map((creditCards ?? []).map((c) => [c.id, c.name]));
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatDate = (value: string | Date) =>
    (typeof value === "string" ? new Date(`${value}T00:00:00`) : value).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });

  const activeCount = (installments ?? []).filter(
    (i) => !computeInstallmentProgress(i.start_date, i.total_installments).finished,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parcelamentos</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} compra(s) parcelada(s) em andamento.
          </p>
        </div>
        <InstallmentDialog creditCards={creditCards ?? []} categories={categories ?? []} />
      </div>

      <Card>
        <CardContent className="p-0">
          {!installments?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum parcelamento cadastrado ainda. Clique em &quot;Novo parcelamento&quot; para começar.
            </p>
          ) : (
            <div className="divide-y">
              {installments.map((installment) => {
                const progress = computeInstallmentProgress(installment.start_date, installment.total_installments);
                const percent = Math.round((progress.current / installment.total_installments) * 100);

                return (
                  <div key={installment.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">{installment.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {installment.credit_card_id ? creditCardNameById.get(installment.credit_card_id) : "—"}
                          {installment.category_id ? ` · ${categoryNameById.get(installment.category_id)}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {progress.finished ? (
                          <Badge variant="secondary">Concluído</Badge>
                        ) : (
                          <Badge>
                            {progress.current}/{installment.total_installments} parcelas
                          </Badge>
                        )}
                        <InstallmentDialog installment={installment} creditCards={creditCards ?? []} categories={categories ?? []} />
                        <DeleteButton
                          action={deleteInstallment.bind(null, installment.id)}
                          confirmMessage={`Excluir o parcelamento "${installment.description}"?`}
                        />
                      </div>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatCurrency(installment.installment_amount)}/mês · total {formatCurrency(installment.total_amount)}
                      </span>
                      <span>
                        {progress.finished
                          ? `Encerrado em ${formatDate(progress.endDate)}`
                          : `${progress.remaining} restante(s) · término ${formatDate(progress.endDate)}`}
                      </span>
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
