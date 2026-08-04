"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { ColorInput } from "@/components/shared/color-input";
import { saveCreditCard } from "@/lib/actions/credit-cards";
import { CARD_BRAND_LABELS, toSelectItems } from "@/lib/labels";
import type { Database } from "@/types/database";

type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function CreditCardDialog({
  card,
  accounts,
}: {
  card?: CreditCard;
  accounts: Pick<Account, "id" | "name">[];
}) {
  const isEdit = Boolean(card);
  const [brand, setBrand] = useState(card?.brand ?? "visa");
  const [accountId, setAccountId] = useState(card?.account_id ?? "");
  const [color, setColor] = useState(card?.color ?? "#8b5cf6");

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
            Novo cartão
          </Button>
        )
      }
      title={isEdit ? "Editar cartão" : "Novo cartão"}
      action={saveCreditCard}
    >
      {card && <input type="hidden" name="id" value={card.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={card?.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bank">Banco</Label>
          <Input id="bank" name="bank" defaultValue={card?.bank ?? ""} />
        </div>
        <div className="space-y-2">
          <Label>Bandeira</Label>
          <Select
            value={brand}
            onValueChange={(next) => next && setBrand(next)}
            name="brand"
            items={toSelectItems(CARD_BRAND_LABELS)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CARD_BRAND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="last_digits">Últimos dígitos</Label>
          <Input id="last_digits" name="last_digits" maxLength={4} defaultValue={card?.last_digits ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closing_day">Fechamento</Label>
          <Input
            id="closing_day"
            name="closing_day"
            type="number"
            min={1}
            max={31}
            defaultValue={card?.closing_day ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_day">Vencimento</Label>
          <Input
            id="due_day"
            name="due_day"
            type="number"
            min={1}
            max={31}
            defaultValue={card?.due_day ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="credit_limit">Limite</Label>
        <Input
          id="credit_limit"
          name="credit_limit"
          type="number"
          step="0.01"
          defaultValue={card?.credit_limit ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Conta para pagamento</Label>
          <Select
            value={accountId}
            onValueChange={(next) => setAccountId(next ?? "")}
            name="account_id"
            items={accounts.map((account) => ({ value: account.id, label: account.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cor</Label>
          <ColorInput value={color} onChange={setColor} />
          <input type="hidden" name="color" value={color} />
        </div>
      </div>
    </FormDialog>
  );
}
