"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";

const ALL = "all";

type Option = { id: string; name: string };

export function ReportsFilters({
  accounts,
  creditCards,
  categories,
  costCenters,
  merchants,
  defaultStart,
  defaultEnd,
}: {
  accounts: Option[];
  creditCards: Option[];
  categories: Option[];
  costCenters: Option[];
  merchants: Option[];
  defaultStart: string;
  defaultEnd: string;
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
    router.push(`/relatorios?${params.toString()}`);
  }

  const withAll = (label: string, list: Option[]) => [
    { value: ALL, label },
    ...list.map((o) => ({ value: o.id, label: o.name })),
  ];
  const accountItems = useMemo(() => withAll("Todas as contas", accounts), [accounts]);
  const creditCardItems = useMemo(() => withAll("Todos os cartões", creditCards), [creditCards]);
  const categoryItems = useMemo(() => withAll("Todas as categorias", categories), [categories]);
  const costCenterItems = useMemo(() => withAll("Todos os centros de custo", costCenters), [costCenters]);
  const merchantItems = useMemo(() => withAll("Todas as empresas", merchants), [merchants]);
  const typeItems = useMemo(() => withAll("Todos os tipos", Object.entries(TRANSACTION_TYPE_LABELS).map(([id, name]) => ({ id, name }))), []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={searchParams.get("start") ?? defaultStart}
        onChange={(event) => updateParam("start", event.target.value)}
        className="w-40"
      />
      <span className="text-sm text-muted-foreground">até</span>
      <Input
        type="date"
        value={searchParams.get("end") ?? defaultEnd}
        onChange={(event) => updateParam("end", event.target.value)}
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
          {accountItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
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
          {creditCardItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
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
          {categoryItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("cost_center_id") ?? ALL}
        onValueChange={(v) => updateParam("cost_center_id", v ?? ALL)}
        items={costCenterItems}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Centro de custo" />
        </SelectTrigger>
        <SelectContent>
          {costCenterItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("merchant_id") ?? ALL}
        onValueChange={(v) => updateParam("merchant_id", v ?? ALL)}
        items={merchantItems}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Empresa" />
        </SelectTrigger>
        <SelectContent>
          {merchantItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
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
          {typeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {searchParams.toString() && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/relatorios")}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
