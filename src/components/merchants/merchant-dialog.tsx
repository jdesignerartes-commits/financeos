"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { ColorInput } from "@/components/shared/color-input";
import { IconPicker } from "@/components/shared/icon-picker";
import { saveMerchant } from "@/lib/actions/merchants";
import type { Database } from "@/types/database";

type Merchant = Database["public"]["Tables"]["merchants"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];

const NONE = "none";

export function MerchantDialog({
  merchant,
  categories,
  subcategories,
}: {
  merchant?: Merchant;
  categories: Category[];
  subcategories: Subcategory[];
}) {
  const isEdit = Boolean(merchant);
  const [color, setColor] = useState(merchant?.color ?? "#3b82f6");
  const [icon, setIcon] = useState(merchant?.icon ?? "building");
  const [categoryId, setCategoryId] = useState(merchant?.category_id ?? NONE);
  const [subcategoryId, setSubcategoryId] = useState(merchant?.subcategory_id ?? NONE);

  const availableSubcategories = useMemo(
    () => subcategories.filter((sub) => sub.category_id === categoryId),
    [subcategories, categoryId],
  );

  const categoryItems = useMemo(
    () => [{ value: NONE, label: "Nenhuma" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories],
  );
  const subcategoryItems = useMemo(
    () => [{ value: NONE, label: "Nenhuma" }, ...availableSubcategories.map((s) => ({ value: s.id, label: s.name }))],
    [availableSubcategories],
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
            Nova empresa
          </Button>
        )
      }
      title={isEdit ? "Editar empresa" : "Nova empresa"}
      action={saveMerchant}
    >
      {merchant && <input type="hidden" name="id" value={merchant.id} />}

      <div className="space-y-2">
        <Label htmlFor="display_name">Nome</Label>
        <Input id="display_name" name="display_name" required defaultValue={merchant?.display_name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">CNPJ / CPF</Label>
        <Input id="document" name="document" defaultValue={merchant?.document ?? ""} />
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
              {categories.map((category) => (
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
          <Label>Cor</Label>
          <ColorInput value={color} onChange={setColor} />
          <input type="hidden" name="color" value={color} />
        </div>
        <div className="space-y-2">
          <Label>Ícone</Label>
          <IconPicker value={icon} onChange={setIcon} name="icon" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Input id="notes" name="notes" defaultValue={merchant?.notes ?? ""} />
      </div>
    </FormDialog>
  );
}
