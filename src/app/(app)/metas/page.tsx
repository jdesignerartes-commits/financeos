import { createClient } from "@/lib/supabase/server";
import { setGoalStatus, deleteGoal } from "@/lib/actions/goals";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { IconActionButton } from "@/components/shared/icon-action-button";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ban, RotateCcw } from "lucide-react";

export default async function MetasPage() {
  const supabase = await createClient();
  const [{ data: goals }, { data: accounts }] = await Promise.all([
    supabase.from("financial_goals").select("*").order("status").order("target_date"),
    supabase.from("accounts").select("id, name").eq("status", "ativa").order("name"),
  ]);

  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatDate = (value: string | null) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "—";

  const STATUS_LABELS: Record<string, string> = {
    em_andamento: "Em andamento",
    concluida: "Concluída",
    cancelada: "Cancelada",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
          <p className="text-sm text-muted-foreground">Objetivos financeiros com progresso acompanhado.</p>
        </div>
        <GoalDialog accounts={accounts ?? []} />
      </div>

      <Card>
        <CardContent className="p-0">
          {!goals?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhuma meta cadastrada ainda. Clique em &quot;Nova meta&quot; para começar.
            </p>
          ) : (
            <div className="divide-y">
              {goals.map((goal) => {
                const percent = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                const isActive = goal.status === "em_andamento";

                return (
                  <div key={goal.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">{goal.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {goal.account_id ? accountNameById.get(goal.account_id) : "Sem conta vinculada"} · até{" "}
                          {formatDate(goal.target_date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={goal.status === "concluida" ? "default" : goal.status === "cancelada" ? "secondary" : "outline"}>
                          {STATUS_LABELS[goal.status]}
                        </Badge>
                        <GoalDialog goal={goal} accounts={accounts ?? []} />
                        {isActive ? (
                          <IconActionButton label="Cancelar" action={setGoalStatus.bind(null, goal.id, "cancelada")}>
                            <Ban className="h-4 w-4" />
                          </IconActionButton>
                        ) : (
                          <IconActionButton
                            label="Reativar"
                            action={setGoalStatus.bind(null, goal.id, "em_andamento")}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </IconActionButton>
                        )}
                        <DeleteButton
                          action={deleteGoal.bind(null, goal.id)}
                          confirmMessage={`Excluir a meta "${goal.name}"?`}
                        />
                      </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${goal.status === "concluida" ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)} ({percent.toFixed(0)}%)
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
