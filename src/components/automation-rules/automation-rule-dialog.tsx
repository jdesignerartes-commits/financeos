"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { saveAutomationRule } from "@/lib/actions/automation-rules";
import {
  RULE_FIELD_LABELS,
  RULE_OPERATOR_LABELS,
  RULE_TEXT_OPERATORS,
  RULE_NUMBER_OPERATORS,
  RULE_ACTION_TYPE_LABELS,
  toSelectItems,
} from "@/lib/labels";
import type { Database } from "@/types/database";

type AutomationRule = Database["public"]["Tables"]["automation_rules"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Merchant = Database["public"]["Tables"]["merchants"]["Row"];
type CostCenter = Database["public"]["Tables"]["cost_centers"]["Row"];

const NONE = "none";

export function AutomationRuleDialog({
  rule,
  categories,
  merchants,
  costCenters,
}: {
  rule?: AutomationRule;
  categories: Pick<Category, "id" | "name">[];
  merchants: Pick<Merchant, "id" | "display_name">[];
  costCenters: Pick<CostCenter, "id" | "name">[];
}) {
  const isEdit = Boolean(rule);
  const [field, setField] = useState(rule?.field ?? "descricao");
  const [operator, setOperator] = useState(rule?.operator ?? "contem");
  const [actionType, setActionType] = useState(rule?.action_type ?? "categorizar");
  const [actionValue, setActionValue] = useState(rule?.action_value ?? NONE);

  const isNumberField = field === "valor";
  const operatorOptions = isNumberField ? RULE_NUMBER_OPERATORS : RULE_TEXT_OPERATORS;
  const operatorItems = useMemo(
    () => operatorOptions.map((value) => ({ value, label: RULE_OPERATOR_LABELS[value] })),
    [operatorOptions],
  );

  const actionValueItems = useMemo(() => {
    if (actionType === "categorizar") return [{ value: NONE, label: "Selecione" }, ...categories.map((c) => ({ value: c.id, label: c.name }))];
    if (actionType === "definir_empresa") return [{ value: NONE, label: "Selecione" }, ...merchants.map((m) => ({ value: m.id, label: m.display_name }))];
    if (actionType === "definir_centro_custo") return [{ value: NONE, label: "Selecione" }, ...costCenters.map((c) => ({ value: c.id, label: c.name }))];
    return [];
  }, [actionType, categories, merchants, costCenters]);

  const needsActionValue = ["categorizar", "definir_empresa", "definir_centro_custo"].includes(actionType);

  return (
    <FormDialog
      trigger={
        isEdit ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="sm">
            <Plus className="h-4 w-4" />
            Nova regra
          </Button>
        )
      }
      title={isEdit ? "Editar regra" : "Nova regra automática"}
      action={saveAutomationRule}
    >
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={rule?.name} placeholder="Ex: iFood é Alimentação" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Campo</Label>
          <Select
            value={field}
            onValueChange={(next) => {
              if (!next) return;
              setField(next as typeof field);
              setOperator(next === "valor" ? "maior_que" : "contem");
            }}
            name="field"
            items={toSelectItems(RULE_FIELD_LABELS)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RULE_FIELD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Operador</Label>
          <Select
            value={operator}
            onValueChange={(next) => next && setOperator(next as typeof operator)}
            name="operator"
            items={operatorItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operatorOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {RULE_OPERATOR_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="search_value">Valor buscado</Label>
        <Input
          id="search_value"
          name="search_value"
          type={isNumberField ? "number" : "text"}
          step={isNumberField ? "0.01" : undefined}
          required
          defaultValue={rule?.search_value}
          placeholder={isNumberField ? "0.00" : "Ex: IFOOD"}
        />
      </div>

      <div className="space-y-2">
        <Label>Ação</Label>
        <Select
          value={actionType}
          onValueChange={(next) => {
            if (!next) return;
            setActionType(next as typeof actionType);
            setActionValue(NONE);
          }}
          name="action_type"
          items={toSelectItems(RULE_ACTION_TYPE_LABELS)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RULE_ACTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {needsActionValue && (
        <div className="space-y-2">
          <Label>Valor da ação</Label>
          <Select
            value={actionValue}
            onValueChange={(next) => setActionValue(next ?? NONE)}
            name="action_value"
            items={actionValueItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {actionType === "categorizar" &&
                categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              {actionType === "definir_empresa" &&
                merchants.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name}
                  </SelectItem>
                ))}
              {actionType === "definir_centro_custo" &&
                costCenters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="priority">Prioridade</Label>
        <Input id="priority" name="priority" type="number" step="1" defaultValue={rule?.priority ?? 0} />
        <p className="text-xs text-muted-foreground">Regras com prioridade maior são aplicadas por último (vencem em conflito).</p>
      </div>
    </FormDialog>
  );
}
