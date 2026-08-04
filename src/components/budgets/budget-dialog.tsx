"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { saveBudget } from "@/lib/actions/budgets";
import type { Database } from "@/types/database";

type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];
type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type CostCenter = Database["public"]["Tables"]["cost_centers"]["Row"];

const TARGET_TYPE_LABELS: Record<string, string> = {
  category: "Categoria",
  account: "Conta",
  credit_card: "Cartão",
  cost_center: "Centro de custo",
};

function currentTargetType(budget?: Budget): keyof typeof TARGET_TYPE_LABELS {
  if (!budget) return "category";
  if (budget.category_id) return "category";
  if (budget.account_id) return "account";
  if (budget.credit_card_id) return "credit_card";
  return "cost_center";
}

function currentTargetId(budget?: Budget): string {
  if (!budget) return "";
  return budget.category_id ?? budget.account_id ?? budget.credit_card_id ?? budget.cost_center_id ?? "";
}

export function BudgetDialog({
  budget,
  categories,
  accounts,
  creditCards,
  costCenters,
}: {
  budget?: Budget;
  categories: Pick<Category, "id" | "name">[];
  accounts: Pick<Account, "id" | "name">[];
  creditCards: Pick<CreditCard, "id" | "name">[];
  costCenters: Pick<CostCenter, "id" | "name">[];
}) {
  const isEdit = Boolean(budget);
  const [targetType, setTargetType] = useState<keyof typeof TARGET_TYPE_LABELS>(currentTargetType(budget));
  const [targetId, setTargetId] = useState(currentTargetId(budget));

  const targetOptions = useMemo(() => {
    const optionsByType: Record<string, { id: string; name: string }[]> = {
      category: categories,
      account: accounts,
      credit_card: creditCards,
      cost_center: costCenters,
    };
    return optionsByType[targetType] ?? [];
  }, [targetType, categories, accounts, creditCards, costCenters]);
  const targetItems = useMemo(
    () => targetOptions.map((o) => ({ value: o.id, label: o.name })),
    [targetOptions],
  );

  const defaultPeriod = budget
    ? `${budget.period_year}-${String(budget.period_month).padStart(2, "0")}`
    : new Date().toISOString().slice(0, 7);

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
            Novo orçamento
          </Button>
        )
      }
      title={isEdit ? "Editar orçamento" : "Novo orçamento"}
      action={saveBudget}
    >
      {budget && <input type="hidden" name="id" value={budget.id} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de alvo</Label>
          <Select
            value={targetType}
            onValueChange={(next) => {
              if (!next) return;
              setTargetType(next as keyof typeof TARGET_TYPE_LABELS);
              setTargetId("");
            }}
            name="target_type"
            items={Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{TARGET_TYPE_LABELS[targetType]}</Label>
          <Select value={targetId} onValueChange={(next) => setTargetId(next ?? "")} name="target_id" items={targetItems}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="period">Período</Label>
          <Input id="period" name="period" type="month" required defaultValue={defaultPeriod} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="limit_amount">Limite mensal</Label>
          <Input
            id="limit_amount"
            name="limit_amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={budget?.limit_amount}
          />
        </div>
      </div>
    </FormDialog>
  );
}
