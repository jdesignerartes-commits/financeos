"use client";

import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import { saveSubcategory } from "@/lib/actions/categories";
import type { Database } from "@/types/database";

type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];

export function SubcategoryDialog({
  categoryId,
  subcategory,
}: {
  categoryId: string;
  subcategory?: Subcategory;
}) {
  const isEdit = Boolean(subcategory);

  return (
    <FormDialog
      trigger={
        isEdit ? (
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Editar subcategoria">
            <Pencil className="h-3 w-3" />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="xs">
            <Plus className="h-3 w-3" />
            Subcategoria
          </Button>
        )
      }
      title={isEdit ? "Editar subcategoria" : "Nova subcategoria"}
      action={saveSubcategory}
    >
      {subcategory && <input type="hidden" name="id" value={subcategory.id} />}
      <input type="hidden" name="category_id" value={categoryId} />

      <div className="space-y-2">
        <Label htmlFor="sub-name">Nome</Label>
        <Input id="sub-name" name="name" required defaultValue={subcategory?.name} />
      </div>
    </FormDialog>
  );
}
