"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { saveTransaction } from "@/lib/actions/transactions";
import { TRANSACTION_TYPE_LABELS, PAYMENT_METHOD_LABELS, toSelectItems } from "@/lib/labels";
import type { Database } from "@/types/database";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];
type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];
type Merchant = Database["public"]["Tables"]["merchants"]["Row"];
type CostCenter = Database["public"]["Tables"]["cost_centers"]["Row"];

const NONE = "none";

function toDateInputValue(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function TransactionDialog({
  transaction,
  accounts,
  creditCards,
  categories,
  subcategories,
  merchants,
  costCenters,
}: {
  transaction?: Transaction;
  accounts: Pick<Account, "id" | "name">[];
  creditCards: Pick<CreditCard, "id" | "name">[];
  categories: Category[];
  subcategories: Subcategory[];
  merchants: Pick<Merchant, "id" | "display_name">[];
  costCenters: Pick<CostCenter, "id" | "name">[];
}) {
  const isEdit = Boolean(transaction);
  const [type, setType] = useState(transaction?.type ?? "despesa");
  const [accountId, setAccountId] = useState(transaction?.account_id ?? NONE);
  const [creditCardId, setCreditCardId] = useState(transaction?.credit_card_id ?? NONE);
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? NONE);
  const [subcategoryId, setSubcategoryId] = useState(transaction?.subcategory_id ?? NONE);
  const [merchantId, setMerchantId] = useState(transaction?.merchant_id ?? NONE);
  const [costCenterId, setCostCenterId] = useState(transaction?.cost_center_id ?? NONE);
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method ?? NONE);

  const relevantCategories = useMemo(
    () => categories.filter((category) => (type === "receita" ? category.type === "receita" : category.type === "despesa")),
    [categories, type],
  );
  const availableSubcategories = useMemo(
    () => subcategories.filter((sub) => sub.category_id === categoryId),
    [subcategories, categoryId],
  );

  const withNone = (label: string, list: { value: string; label: string }[]) => [
    { value: NONE, label },
    ...list,
  ];
  const accountItems = useMemo(
    () => withNone("Nenhuma", accounts.map((a) => ({ value: a.id, label: a.name }))),
    [accounts],
  );
  const creditCardItems = useMemo(
    () => withNone("Nenhum", creditCards.map((c) => ({ value: c.id, label: c.name }))),
    [creditCards],
  );
  const categoryItems = useMemo(
    () => withNone("Nenhuma", relevantCategories.map((c) => ({ value: c.id, label: c.name }))),
    [relevantCategories],
  );
  const subcategoryItems = useMemo(
    () => withNone("Nenhuma", availableSubcategories.map((s) => ({ value: s.id, label: s.name }))),
    [availableSubcategories],
  );
  const merchantItems = useMemo(
    () => withNone("Nenhuma", merchants.map((m) => ({ value: m.id, label: m.display_name }))),
    [merchants],
  );
  const costCenterItems = useMemo(
    () => withNone("Nenhum", costCenters.map((c) => ({ value: c.id, label: c.name }))),
    [costCenters],
  );
  const paymentMethodItems = useMemo(
    () => withNone("Não informada", toSelectItems(PAYMENT_METHOD_LABELS)),
    [],
  );

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
            Nova transação
          </Button>
        )
      }
      title={isEdit ? "Editar transação" : "Nova transação"}
      action={saveTransaction}
    >
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" required defaultValue={toDateInputValue(transaction?.date)} />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={type}
            onValueChange={(next) => {
              if (!next) return;
              setType(next);
              setCategoryId(NONE);
              setSubcategoryId(NONE);
            }}
            name="type"
            items={toSelectItems(TRANSACTION_TYPE_LABELS)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="friendly_description">Descrição</Label>
        <Input
          id="friendly_description"
          name="friendly_description"
          required
          defaultValue={transaction?.friendly_description ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={transaction?.amount ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Conta</Label>
          <Select
            value={accountId}
            onValueChange={(next) => setAccountId(next ?? NONE)}
            name="account_id"
            items={accountItems}
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
            items={creditCardItems}
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
          <Label>Categoria</Label>
          <Select
            value={categoryId}
            onValueChange={(next) => {
              setCategoryId(next ?? NONE);
              setSubcategoryId(NONE);
            }}
            name="category_id"
            items={categoryItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nenhuma</SelectItem>
              {relevantCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Subcategoria</Label>
          <Select
            value={subcategoryId}
            onValueChange={(next) => setSubcategoryId(next ?? NONE)}
            name="subcategory_id"
            disabled={categoryId === NONE || availableSubcategories.length === 0}
            items={subcategoryItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nenhuma</SelectItem>
              {availableSubcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Empresa</Label>
          <Select
            value={merchantId}
            onValueChange={(next) => setMerchantId(next ?? NONE)}
            name="merchant_id"
            items={merchantItems}
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
        <div className="space-y-2">
          <Label>Centro de custo</Label>
          <Select
            value={costCenterId}
            onValueChange={(next) => setCostCenterId(next ?? NONE)}
            name="cost_center_id"
            items={costCenterItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nenhum</SelectItem>
              {costCenters.map((costCenter) => (
                <SelectItem key={costCenter.id} value={costCenter.id}>
                  {costCenter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Forma de pagamento</Label>
        <Select
          value={paymentMethod}
          onValueChange={(next) => setPaymentMethod(next ?? NONE)}
          name="payment_method"
          items={paymentMethodItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Não informada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Não informada</SelectItem>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Input id="notes" name="notes" defaultValue={transaction?.notes ?? ""} />
      </div>
    </FormDialog>
  );
}
