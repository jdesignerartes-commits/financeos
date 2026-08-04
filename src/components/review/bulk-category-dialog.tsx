"use client";

import { useMemo, useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { bulkSetCategoryAction } from "@/lib/actions/review";
import type { Database } from "@/types/database";
import type { CandidateRef } from "@/lib/actions/review";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];

const NONE = "none";

export function BulkCategoryDialog({
  refs,
  categories,
  subcategories,
}: {
  refs: CandidateRef[];
  categories: Category[];
  subcategories: Subcategory[];
}) {
  const [categoryId, setCategoryId] = useState(NONE);
  const [subcategoryId, setSubcategoryId] = useState(NONE);

  const availableSubcategories = useMemo(
    () => subcategories.filter((s) => s.category_id === categoryId),
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
        <Button type="button" variant="outline" size="sm">
          <Tag className="h-4 w-4" />
          Categoria em lote
        </Button>
      }
      title={`Definir categoria para ${refs.length} transação(ões)`}
      action={bulkSetCategoryAction}
      submitLabel="Aplicar"
    >
      <input type="hidden" name="refs" value={JSON.stringify(refs)} />

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
    </FormDialog>
  );
}
