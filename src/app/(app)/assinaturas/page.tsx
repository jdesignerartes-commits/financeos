import { createClient } from "@/lib/supabase/server";
import { setSubscriptionStatus, deleteSubscription } from "@/lib/actions/subscriptions";
import { SubscriptionDialog } from "@/components/subscriptions/subscription-dialog";
import { DetectButton } from "@/components/subscriptions/detect-button";
import { IconActionButton } from "@/components/shared/icon-action-button";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Ban } from "lucide-react";

const FREQUENCY_LABELS: Record<string, string> = {
  mensal: "Mensal",
  anual: "Anual",
  semanal: "Semanal",
  outro: "Outro",
};

export default async function AssinaturasPage() {
  const supabase = await createClient();
  const [{ data: subscriptions }, { data: merchants }, { data: accounts }, { data: creditCards }] = await Promise.all([
    supabase.from("subscriptions").select("*").order("status").order("name"),
    supabase.from("merchants").select("id, display_name").order("display_name"),
    supabase.from("accounts").select("id, name").eq("status", "ativa").order("name"),
    supabase.from("credit_cards").select("id, name").eq("status", "ativo").order("name"),
  ]);

  const formatCurrency = (value: number | null) =>
    value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatDate = (value: string | null) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "—";

  const suggested = (subscriptions ?? []).filter((s) => s.status === "sugerida");
  const active = (subscriptions ?? []).filter((s) => s.status === "ativa");
  const inactive = (subscriptions ?? []).filter((s) => s.status === "rejeitada" || s.status === "cancelada");

  const monthlyTotal = active.reduce((acc, s) => {
    if (!s.current_amount) return acc;
    if (s.frequency === "anual") return acc + s.current_amount / 12;
    if (s.frequency === "semanal") return acc + s.current_amount * 4.33;
    return acc + s.current_amount;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} ativa(s) · {formatCurrency(monthlyTotal)}/mês estimado
          </p>
        </div>
        <div className="flex gap-2">
          <DetectButton />
          <SubscriptionDialog merchants={merchants ?? []} accounts={accounts ?? []} creditCards={creditCards ?? []} />
        </div>
      </div>

      {suggested.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sugeridas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Identificamos cobranças recorrentes nas suas transações. Confirme ou rejeite cada uma.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {suggested.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="font-medium">{sub.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(sub.current_amount)} · última cobrança {formatDate(sub.last_charge_date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconActionButton label="Confirmar" action={setSubscriptionStatus.bind(null, sub.id, "ativa")}>
                      <Check className="h-4 w-4" />
                    </IconActionButton>
                    <IconActionButton label="Rejeitar" action={setSubscriptionStatus.bind(null, sub.id, "rejeitada")}>
                      <X className="h-4 w-4" />
                    </IconActionButton>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ativas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!active.length ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma assinatura ativa ainda.</p>
          ) : (
            <div className="divide-y">
              {active.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="font-medium">{sub.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {FREQUENCY_LABELS[sub.frequency]} · {formatCurrency(sub.current_amount)} · próxima{" "}
                      {formatDate(sub.next_expected_date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <SubscriptionDialog
                      subscription={sub}
                      merchants={merchants ?? []}
                      accounts={accounts ?? []}
                      creditCards={creditCards ?? []}
                    />
                    <IconActionButton label="Cancelar" action={setSubscriptionStatus.bind(null, sub.id, "cancelada")}>
                      <Ban className="h-4 w-4" />
                    </IconActionButton>
                    <DeleteButton
                      action={deleteSubscription.bind(null, sub.id)}
                      confirmMessage={`Excluir a assinatura "${sub.name}"?`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Rejeitadas / canceladas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {inactive.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="text-sm text-muted-foreground">{sub.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{sub.status === "rejeitada" ? "Rejeitada" : "Cancelada"}</Badge>
                    <DeleteButton
                      action={deleteSubscription.bind(null, sub.id)}
                      confirmMessage={`Excluir a assinatura "${sub.name}"?`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
