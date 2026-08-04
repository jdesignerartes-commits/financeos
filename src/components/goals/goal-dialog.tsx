"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { saveGoal } from "@/lib/actions/goals";
import type { Database } from "@/types/database";

type Goal = Database["public"]["Tables"]["financial_goals"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

const NONE = "none";

export function GoalDialog({
  goal,
  accounts,
}: {
  goal?: Goal;
  accounts: Pick<Account, "id" | "name">[];
}) {
  const isEdit = Boolean(goal);
  const [accountId, setAccountId] = useState(goal?.account_id ?? NONE);

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
            Nova meta
          </Button>
        )
      }
      title={isEdit ? "Editar meta" : "Nova meta"}
      action={saveGoal}
    >
      {goal && <input type="hidden" name="id" value={goal.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={goal?.name} placeholder="Ex: Viagem para a praia" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target_amount">Valor total</Label>
          <Input
            id="target_amount"
            name="target_amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={goal?.target_amount}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="current_amount">Valor acumulado</Label>
          <Input
            id="current_amount"
            name="current_amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={goal?.current_amount ?? 0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Data de início</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={goal?.start_date ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_date">Data desejada</Label>
          <Input id="target_date" name="target_date" type="date" defaultValue={goal?.target_date ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Conta vinculada</Label>
        <Select
          value={accountId}
          onValueChange={(next) => setAccountId(next ?? NONE)}
          name="account_id"
          items={[{ value: NONE, label: "Nenhuma" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Nenhuma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Nenhuma</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FormDialog>
  );
}
