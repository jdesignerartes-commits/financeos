"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { ColorInput } from "@/components/shared/color-input";
import { IconPicker } from "@/components/shared/icon-picker";
import { saveAccount } from "@/lib/actions/accounts";
import { ACCOUNT_TYPE_LABELS, toSelectItems } from "@/lib/labels";
import type { Database } from "@/types/database";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function AccountDialog({ account }: { account?: Account }) {
  const isEdit = Boolean(account);
  const [type, setType] = useState(account?.type ?? "conta_corrente");
  const [color, setColor] = useState(account?.color ?? "#3b82f6");
  const [icon, setIcon] = useState(account?.icon ?? "landmark");

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
            Nova conta
          </Button>
        )
      }
      title={isEdit ? "Editar conta" : "Nova conta"}
      action={saveAccount}
    >
      {account && <input type="hidden" name="id" value={account.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={account?.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="institution">Instituição</Label>
        <Input id="institution" name="institution" defaultValue={account?.institution ?? ""} />
      </div>

      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          value={type}
          onValueChange={(next) => next && setType(next)}
          name="type"
          items={toSelectItems(ACCOUNT_TYPE_LABELS)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="initial_balance">Saldo inicial</Label>
        <Input
          id="initial_balance"
          name="initial_balance"
          type="number"
          step="0.01"
          defaultValue={account?.initial_balance ?? 0}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cor</Label>
          <ColorInput value={color} onChange={setColor} />
          <input type="hidden" name="color" value={color} />
        </div>
        <div className="space-y-2">
          <Label>Ícone</Label>
          <IconPicker value={icon} onChange={setIcon} name="icon" />
        </div>
      </div>
    </FormDialog>
  );
}
