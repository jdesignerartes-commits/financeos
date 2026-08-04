"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/shared/form-dialog";
import { updateCandidateAction } from "@/lib/actions/review";
import { TRANSACTION_TYPE_LABELS, toSelectItems } from "@/lib/labels";
import type { TransactionType } from "@/lib/ingestion/types";
import type { Database } from "@/types/database";
import type { ReviewCandidate } from "@/lib/review-types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];
type Merchant = Database["public"]["Tables"]["merchants"]["Row"];

const NONE = "none";

export function CandidateEditDialog({
  candidate,
  categories,
  subcategories,
  merchants,
}: {
  candidate: ReviewCandidate;
  categories: Category[];
  subcategories: Subcategory[];
  merchants: Pick<Merchant, "id" | "display_name">[];
}) {
  const [type, setType] = useState<TransactionType>(candidate.type);
  const [categoryId, setCategoryId] = useState(candidate.categoryId ?? NONE);
  const [subcategoryId, setSubcategoryId] = useState(candidate.subcategoryId ?? NONE);
  const [merchantId, setMerchantId] = useState(candidate.merchantId ?? NONE);

  const relevantCategories = useMemo(() => {
    if (type === "despesa" || type === "receita") return categories.filter((c) => c.type === type);
    return categories;
  }, [categories, type]);
  const availableSubcategories = useMemo(
    () => subcategories.filter((s) => s.category_id === categoryId),
    [subcategories, categoryId],
  );

  const categoryItems = useMemo(
    () => [{ value: NONE, label: "Nenhuma" }, ...relevantCategories.map((c) => ({ value: c.id, label: c.name }))],
    [relevantCategories],
  );
  const subcategoryItems = useMemo(
    () => [{ value: NONE, label: "Nenhuma" }, ...availableSubcategories.map((s) => ({ value: s.id, label: s.name }))],
    [availableSubcategories],
  );
  const merchantItems = useMemo(
    () => [{ value: NONE, label: "Nenhuma" }, ...merchants.map((m) => ({ value: m.id, label: m.display_name }))],
    [merchants],
  );

  return (
    <FormDialog
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      }
      title="Editar transação"
      action={updateCandidateAction}
    >
      <input type="hidden" name="fileId" value={candidate.fileId} />
      <input type="hidden" name="index" value={candidate.index} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" required defaultValue={candidate.date} />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={type}
            onValueChange={(next) => {
              if (!next) return;
              setType(next as TransactionType);
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
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" required defaultValue={candidate.description} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={candidate.amount} />
      </div>

      <div className="space-y-2">
        <Label>Empresa</Label>
        <Select value={merchantId} onValueChange={(next) => setMerchantId(next ?? NONE)} name="merchant_id" items={merchantItems}>
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
        <p className="text-xs text-muted-foreground">
          Ao escolher uma empresa, o sistema aprende esse texto para reconhecer automaticamente da próxima vez.
        </p>
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
    </FormDialog>
  );
}
