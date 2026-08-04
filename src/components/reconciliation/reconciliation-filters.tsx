"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ReconciliationFilters({
  accounts,
  creditCards,
  defaultTarget,
}: {
  accounts: { id: string; name: string }[];
  creditCards: { id: string; name: string }[];
  defaultTarget: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const target = searchParams.get("target") ?? defaultTarget;

  const targetItems = useMemo(
    () => [
      ...accounts.map((a) => ({ value: `account:${a.id}`, label: `Conta — ${a.name}` })),
      ...creditCards.map((c) => ({ value: `card:${c.id}`, label: `Cartão — ${c.name}` })),
    ],
    [accounts, creditCards],
  );

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/conciliacao?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={target} onValueChange={(v) => v && updateParam("target", v)} items={targetItems}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Selecione conta ou cartão" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={`account:${account.id}`} value={`account:${account.id}`}>
              Conta — {account.name}
            </SelectItem>
          ))}
          {creditCards.map((card) => (
            <SelectItem key={`card:${card.id}`} value={`card:${card.id}`}>
              Cartão — {card.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="month"
        value={month}
        onChange={(event) => updateParam("month", event.target.value)}
        className="w-40"
      />
    </div>
  );
}
