"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { saveInstallment } from "@/lib/actions/installments";
import type { Database } from "@/types/database";

type Installment = Database["public"]["Tables"]["installments"]["Row"];
type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

const NONE = "none";

export function InstallmentDialog({
  installment,
  creditCards,
  categories,
}: {
  installment?: Installment;
  creditCards: Pick<CreditCard, "id" | "name">[];
  categories: Pick<Category, "id" | "name">[];
}) {
  const isEdit = Boolean(installment);
  const [creditCardId, setCreditCardId] = useState(installment?.credit_card_id ?? NONE);
  const [categoryId, setCategoryId] = useState(installment?.category_id ?? NONE);

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
            Novo parcelamento
          </Button>
        )
      }
      title={isEdit ? "Editar parcelamento" : "Novo parcelamento"}
      action={saveInstallment}
    >
      {installment && <input type="hidden" name="id" value={installment.id} />}

      <div className="space-y-2">
        <Label htmlFor="description">Descrição da compra</Label>
        <Input id="description" name="description" required defaultValue={installment?.description} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="installment_amount">Valor da parcela</Label>
          <Input
            id="installment_amount"
            name="installment_amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={installment?.installment_amount}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_installments">Total de parcelas</Label>
          <Input
            id="total_installments"
            name="total_installments"
            type="number"
            step="1"
            min="1"
            required
            defaultValue={installment?.total_installments}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start_date">Data da 1ª parcela</Label>
        <Input
          id="start_date"
          name="start_date"
          type="date"
          required
          defaultValue={installment?.start_date ?? new Date().toISOString().slice(0, 10)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cartão</Label>
          <Select
            value={creditCardId}
            onValueChange={(next) => setCreditCardId(next ?? NONE)}
            name="credit_card_id"
            items={[{ value: NONE, label: "Nenhum" }, ...creditCards.map((c) => ({ value: c.id, label: c.name }))]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nenhum</SelectItem>
              {creditCards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={categoryId}
            onValueChange={(next) => setCategoryId(next ?? NONE)}
            name="category_id"
            items={[{ value: NONE, label: "Nenhuma" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nenhuma</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormDialog>
  );
}
