import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setCostCenterStatus, deleteCostCenter } from "@/lib/actions/cost-centers";
import { setAutomationRuleStatus, deleteAutomationRule } from "@/lib/actions/automation-rules";
import { CostCenterDialog } from "@/components/cost-centers/cost-center-dialog";
import { AutomationRuleDialog } from "@/components/automation-rules/automation-rule-dialog";
import { StatusToggleButton } from "@/components/shared/status-toggle-button";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getIcon } from "@/lib/icon-options";
import { RULE_FIELD_LABELS, RULE_OPERATOR_LABELS, RULE_ACTION_TYPE_LABELS } from "@/lib/labels";
import { MORE_PAGES } from "@/lib/nav";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const [{ data: costCenters }, { data: rules }, { data: categories }, { data: merchants }, { data: activeCostCenters }] =
    await Promise.all([
      supabase.from("cost_centers").select("*").order("status", { ascending: true }).order("name", { ascending: true }),
      supabase.from("automation_rules").select("*").order("priority", { ascending: false }),
      supabase.from("categories").select("id, name").eq("status", "ativa").order("sort_order"),
      supabase.from("merchants").select("id, display_name").order("display_name"),
      supabase.from("cost_centers").select("id, name").eq("status", "ativo").order("name"),
    ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const merchantNameById = new Map((merchants ?? []).map((m) => [m.id, m.display_name]));
  const costCenterNameById = new Map((activeCostCenters ?? []).map((c) => [c.id, c.name]));

  function actionValueLabel(actionType: string, actionValue: string | null) {
    if (!actionValue) return null;
    if (actionType === "categorizar") return categoryNameById.get(actionValue) ?? actionValue;
    if (actionType === "definir_empresa") return merchantNameById.get(actionValue) ?? actionValue;
    if (actionType === "definir_centro_custo") return costCenterNameById.get(actionValue) ?? actionValue;
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências e configurações gerais da conta.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mais páginas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Menu principal ficou só com o essencial — o resto continua aqui.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {MORE_PAGES.map((page) => {
              const Icon = page.icon;
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {page.label}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Regras automáticas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Aplicadas durante a importação, antes da revisão — ex: toda descrição contendo &quot;IFOOD&quot; vira
              Alimentação.
            </p>
          </div>
          <AutomationRuleDialog categories={categories ?? []} merchants={merchants ?? []} costCenters={activeCostCenters ?? []} />
        </CardHeader>
        <CardContent className="p-0">
          {!rules?.length ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma regra cadastrada ainda.</p>
          ) : (
            <div className="divide-y">
              {rules.map((rule) => {
                const valueLabel = actionValueLabel(rule.action_type, rule.action_value);
                return (
                  <div key={rule.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <p className="text-sm text-muted-foreground">
                        Se {RULE_FIELD_LABELS[rule.field]} {RULE_OPERATOR_LABELS[rule.operator].toLowerCase()} &quot;
                        {rule.search_value}&quot; → {RULE_ACTION_TYPE_LABELS[rule.action_type]}
                        {valueLabel ? `: ${valueLabel}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">Prioridade {rule.priority}</Badge>
                      <Badge variant={rule.status === "ativa" ? "default" : "secondary"}>
                        {rule.status === "ativa" ? "Ativa" : "Inativa"}
                      </Badge>
                      <AutomationRuleDialog
                        rule={rule}
                        categories={categories ?? []}
                        merchants={merchants ?? []}
                        costCenters={activeCostCenters ?? []}
                      />
                      <StatusToggleButton
                        isActive={rule.status === "ativa"}
                        action={setAutomationRuleStatus.bind(null, rule.id, rule.status === "ativa" ? "inativa" : "ativa")}
                      />
                      <DeleteButton
                        action={deleteAutomationRule.bind(null, rule.id)}
                        confirmMessage={`Excluir a regra "${rule.name}"?`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Centros de custo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Separe despesas por áreas como Pessoal, Casa ou Empresa.
            </p>
          </div>
          <CostCenterDialog />
        </CardHeader>
        <CardContent className="p-0">
          {!costCenters?.length ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum centro de custo cadastrado ainda.</p>
          ) : (
            <div className="divide-y">
              {costCenters.map((costCenter) => {
                const Icon = getIcon(costCenter.icon);
                return (
                  <div key={costCenter.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{
                          backgroundColor: `${costCenter.color ?? "#3b82f6"}20`,
                          color: costCenter.color ?? "#3b82f6",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {costCenter.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={costCenter.status === "ativo" ? "default" : "secondary"}>
                        {costCenter.status === "ativo" ? "Ativo" : "Arquivado"}
                      </Badge>
                      <CostCenterDialog costCenter={costCenter} />
                      <StatusToggleButton
                        isActive={costCenter.status === "ativo"}
                        action={setCostCenterStatus.bind(
                          null,
                          costCenter.id,
                          costCenter.status === "ativo" ? "arquivado" : "ativo",
                        )}
                      />
                      <DeleteButton
                        action={deleteCostCenter.bind(null, costCenter.id)}
                        confirmMessage={`Excluir o centro de custo "${costCenter.name}"?`}
                      />
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
