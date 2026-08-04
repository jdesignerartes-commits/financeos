"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { createReconciliationItem } from "@/lib/actions/reconciliation";
import { RECONCILIATION_TYPE_LABELS, toSelectItems } from "@/lib/labels";

export function NewReconciliationDialog({
  transactionOptions,
}: {
  transactionOptions: { value: string; label: string }[];
}) {
  const typeItems = toSelectItems(RECONCILIATION_TYPE_LABELS);
  const relatedItems = [{ value: "none", label: "Nenhuma" }, ...transactionOptions];

  return (
    <FormDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Nova pendência
        </Button>
      }
      title="Nova pendência de conciliação"
      description="Vincule manualmente duas transações (ex.: pagamento de fatura, transferência entre contas)."
      action={createReconciliationItem}
    >
      <div className="space-y-2">
        <Label>Transação</Label>
        <Select name="transaction_id" items={transactionOptions}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a transação" />
          </SelectTrigger>
          <SelectContent>
            {transactionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Transação relacionada</Label>
        <Select name="related_transaction_id" defaultValue="none" items={relatedItems}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {relatedItems.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select name="type" defaultValue="transferencia_interna" items={typeItems}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeItems.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Input id="notes" name="notes" />
      </div>
    </FormDialog>
  );
}
