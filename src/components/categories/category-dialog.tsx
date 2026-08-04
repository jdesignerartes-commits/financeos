"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import { ColorInput } from "@/components/shared/color-input";
import { IconPicker } from "@/components/shared/icon-picker";
import { saveCategory } from "@/lib/actions/categories";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export function CategoryDialog({
  category,
  type,
}: {
  category?: Category;
  type: "receita" | "despesa";
}) {
  const isEdit = Boolean(category);
  const [color, setColor] = useState(category?.color ?? "#3b82f6");
  const [icon, setIcon] = useState(category?.icon ?? "tag");

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
            Nova categoria
          </Button>
        )
      }
      title={isEdit ? "Editar categoria" : `Nova categoria de ${type === "despesa" ? "despesa" : "receita"}`}
      action={saveCategory}
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="type" value={type} />

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required defaultValue={category?.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={type === "despesa" ? "monthly_limit" : "monthly_goal"}>
          {type === "despesa" ? "Limite mensal" : "Meta mensal"}
        </Label>
        {type === "despesa" ? (
          <Input
            id="monthly_limit"
            name="monthly_limit"
            type="number"
            step="0.01"
            defaultValue={category?.monthly_limit ?? ""}
          />
        ) : (
          <Input
            id="monthly_goal"
            name="monthly_goal"
            type="number"
            step="0.01"
            defaultValue={category?.monthly_goal ?? ""}
          />
        )}
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
