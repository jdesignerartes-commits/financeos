"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveStatementBalance } from "@/lib/actions/reconciliation";

export function StatementBalanceForm({
  targetType,
  targetId,
  period,
  informedBalance,
}: {
  targetType: "account" | "credit_card";
  targetId: string;
  period: string;
  informedBalance: number | null;
}) {
  const [state, formAction, isPending] = useActionState(saveStatementBalance, undefined);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="period" value={period} />
      <div className="space-y-1">
        <label htmlFor="informed_balance" className="text-xs text-muted-foreground">
          Saldo informado no extrato
        </label>
        <Input
          id="informed_balance"
          name="informed_balance"
          type="number"
          step="0.01"
          key={`${targetId}-${period}-${informedBalance ?? "empty"}`}
          defaultValue={informedBalance ?? undefined}
          placeholder="0,00"
          className="w-40"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
