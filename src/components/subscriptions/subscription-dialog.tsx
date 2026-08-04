"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { saveSubscription } from "@/lib/actions/subscriptions";
import { toSelectItems } from "@/lib/labels";
import type { Database } from "@/types/database";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type Merchant = Database["public"]["Tables"]["merchants"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];
type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];

const NONE = "none";
const FREQUENCY_LABELS: Record<string, string> = {
  mensal: "Mensal",
  anual: "Anual",
  semanal: "Semanal",
  outro: "Outro",
};

export function SubscriptionDialog({
  subscription,
  merchants,
  accounts,
  creditCards,
}: {
  subscription?: Subscription;
  merchants: Pick<Merchant, "id" | "display_name">[];
  accounts: Pick<Account, "id" | "name">[];
  creditCards: Pick<CreditCard, "id" | "name">[];
}) {
  const isEdit = Boolean(subscription);
  const [merchantId, setMerchantId] = useState(subscription?.merchant_id ?? NONE);
  const [accountId, setAccountId] = useState(subscription?.account_id ?? NONE);
  const [creditCardId, setCreditCardId] = useState(subscription?.credit_card_id ?? NONE);
  const [frequency, setFrequency] = useState(subscription?.frequency ?? "mensal");

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
            Nova assinatura
          </Button>
        )
      }
      title={isEdit ? "Editar assinatura" : "Nova assinatura"}
      action={saveSubscription}
    >
      {subscription && <input type="hidden" name="id" value={subscription.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={subscription?.name} placeholder="Ex: Netflix" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="current_amount">Valor atual</Label>
          <Input
            id="current_amount"
            name="current_amount"
            type="number"
            step="0.01"
            defaultValue={subscription?.current_amount ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label>Frequência</Label>
          <Select
            value={frequency}
            onValueChange={(next) => next && setFrequency(next)}
            name="frequency"
            items={toSelectItems(FREQUENCY_LABELS)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Empresa</Label>
        <Select
          value={merchantId}
          onValueChange={(next) => setMerchantId(next ?? NONE)}
          name="merchant_id"
          items={[{ value: NONE, label: "Nenhuma" }, ...merchants.map((m) => ({ value: m.id, label: m.display_name }))]}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Nenhuma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Nenhuma</SelectItem>
            {merchants.map((merchant) => (
              <SelectItem key={merchant.id} value={merchant.id}>
                {merchant.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Conta</Label>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="last_charge_date">Última cobrança</Label>
          <Input id="last_charge_date" name="last_charge_date" type="date" defaultValue={subscription?.last_charge_date ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next_expected_date">Próxima prevista</Label>
          <Input
            id="next_expected_date"
            name="next_expected_date"
            type="date"
            defaultValue={subscription?.next_expected_date ?? ""}
          />
        </div>
      </div>
    </FormDialog>
  );
}
