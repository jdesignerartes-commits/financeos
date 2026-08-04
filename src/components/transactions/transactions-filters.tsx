"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRANSACTION_TYPE_LABELS, toSelectItems } from "@/lib/labels";
import type { Database } from "@/types/database";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

const ALL = "all";

export function TransactionsFilters({
  accounts,
  creditCards,
  categories,
}: {
  accounts: Pick<Account, "id" | "name">[];
  creditCards: Pick<CreditCard, "id" | "name">[];
  categories: Pick<Category, "id" | "name">[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/transacoes?${params.toString()}`);
  }

  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  const withAll = (label: string, list: { value: string; label: string }[]) => [
    { value: ALL, label },
    ...list,
  ];
  const accountItems = useMemo(
    () => withAll("Todas as contas", accounts.map((a) => ({ value: a.id, label: a.name }))),
    [accounts],
  );
  const creditCardItems = useMemo(
    () => withAll("Todos os cartões", creditCards.map((c) => ({ value: c.id, label: c.name }))),
    [creditCards],
  );
  const categoryItems = useMemo(
    () => withAll("Todas as categorias", categories.map((c) => ({ value: c.id, label: c.name }))),
    [categories],
  );
  const typeItems = useMemo(() => withAll("Todos os tipos", toSelectItems(TRANSACTION_TYPE_LABELS)), []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="month"
        value={month}
        onChange={(event) => updateParam("month", event.target.value)}
        className="w-40"
      />

      <Select
        value={searchParams.get("account_id") ?? ALL}
        onValueChange={(v) => updateParam("account_id", v ?? ALL)}
        items={accountItems}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Conta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as contas</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("credit_card_id") ?? ALL}
        onValueChange={(v) => updateParam("credit_card_id", v ?? ALL)}
        items={creditCardItems}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Cartão" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os cartões</SelectItem>
          {creditCards.map((card) => (
            <SelectItem key={card.id} value={card.id}>
              {card.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("category_id") ?? ALL}
        onValueChange={(v) => updateParam("category_id", v ?? ALL)}
        items={categoryItems}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as categorias</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("type") ?? ALL}
        onValueChange={(v) => updateParam("type", v ?? ALL)}
        items={typeItems}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os tipos</SelectItem>
          {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {searchParams.toString() && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/transacoes")}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
