"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import { ColorInput } from "@/components/shared/color-input";
import { IconPicker } from "@/components/shared/icon-picker";
import { saveCostCenter } from "@/lib/actions/cost-centers";
import type { Database } from "@/types/database";

type CostCenter = Database["public"]["Tables"]["cost_centers"]["Row"];

export function CostCenterDialog({ costCenter }: { costCenter?: CostCenter }) {
  const isEdit = Boolean(costCenter);
  const [color, setColor] = useState(costCenter?.color ?? "#3b82f6");
  const [icon, setIcon] = useState(costCenter?.icon ?? "tag");

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
            Novo centro de custo
          </Button>
        )
      }
      title={isEdit ? "Editar centro de custo" : "Novo centro de custo"}
      action={saveCostCenter}
    >
      {costCenter && <input type="hidden" name="id" value={costCenter.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={costCenter?.name} />
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
