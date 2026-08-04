"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CandidateEditDialog } from "@/components/review/candidate-edit-dialog";
import { BulkCategoryDialog } from "@/components/review/bulk-category-dialog";
import { confirmCandidates, deleteCandidates, type CandidateRef } from "@/lib/actions/review";
import type { ReviewCandidate } from "@/lib/review-types";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];
type Merchant = Database["public"]["Tables"]["merchants"]["Row"];

function keyOf(c: { fileId: string; index: number }) {
  return `${c.fileId}:${c.index}`;
}

function confidenceBadge(confidence: number | null) {
  if (confidence == null) return null;
  if (confidence >= 0.95) return <Badge>Alta confiança</Badge>;
  if (confidence >= 0.8) return <Badge variant="secondary">Média confiança</Badge>;
  return <Badge variant="destructive">Baixa confiança</Badge>;
}

export function ReviewTable({
  candidates,
  categories,
  subcategories,
  merchants,
}: {
  candidates: ReviewCandidate[];
  categories: Category[];
  subcategories: Subcategory[];
  merchants: Pick<Merchant, "id" | "display_name">[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const subcategoryById = useMemo(() => new Map(subcategories.map((s) => [s.id, s])), [subcategories]);
  const merchantById = useMemo(() => new Map(merchants.map((m) => [m.id, m])), [merchants]);

  const allSelected = candidates.length > 0 && selected.size === candidates.length;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(candidates.map(keyOf)));
  }

  function refsFromKeys(keys: Iterable<string>): CandidateRef[] {
    return Array.from(keys).map((key) => {
      const [fileId, index] = key.split(":");
      return { fileId, index: Number(index) };
    });
  }

  function confirmSelected() {
    const refs = refsFromKeys(selected);
    setSelected(new Set());
    startTransition(async () => {
      const result = await confirmCandidates(refs);
      if (result?.error) toast.error(result.error);
    });
  }

  function confirmAll() {
    const refs = candidates.map((c) => ({ fileId: c.fileId, index: c.index }));
    setSelected(new Set());
    startTransition(async () => {
      const result = await confirmCandidates(refs);
      if (result?.error) toast.error(result.error);
    });
  }

  function deleteSelected() {
    if (!window.confirm(`Excluir ${selected.size} transação(ões) da revisão? Isso não pode ser desfeito.`)) return;
    const refs = refsFromKeys(selected);
    startTransition(() => deleteCandidates(refs));
    setSelected(new Set());
  }

  function deleteOne(ref: CandidateRef) {
    if (!window.confirm("Excluir esta transação da revisão?")) return;
    startTransition(() => deleteCandidates([ref]));
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="text-sm text-muted-foreground">{selected.size} selecionada(s)</span>
              <Button type="button" size="sm" disabled={isPending} onClick={confirmSelected}>
                <Check className="h-4 w-4" />
                Confirmar selecionadas
              </Button>
              <BulkCategoryDialog refs={refsFromKeys(selected)} categories={categories} subcategories={subcategories} />
              <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={deleteSelected}>
                <Trash2 className="h-4 w-4" />
                Excluir selecionadas
              </Button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{candidates.length} transação(ões) para revisar</span>
          )}
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={confirmAll}>
          <Check className="h-4 w-4" />
          Confirmar todas
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todas" />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição original</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta / Cartão</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => {
                const key = keyOf(candidate);
                const category = candidate.categoryId ? categoryById.get(candidate.categoryId) : undefined;
                const subcategory = candidate.subcategoryId ? subcategoryById.get(candidate.subcategoryId) : undefined;
                const merchant = candidate.merchantId ? merchantById.get(candidate.merchantId) : undefined;
                const isIncome = candidate.type === "receita";

                return (
                  <TableRow key={key} className={candidate.isPossibleDuplicate ? "bg-destructive/5" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(key)}
                        onCheckedChange={() => toggle(key)}
                        aria-label="Selecionar"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(candidate.date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{candidate.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {merchant ? `${merchant.display_name} · ` : ""}
                        {candidate.fileName}
                      </div>
                      {candidate.isPossibleDuplicate && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <TriangleAlert className="h-3 w-3" />
                          Possível duplicidade
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category ? (
                        <span>
                          {category.name}
                          {subcategory ? ` › ${subcategory.name}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {candidate.creditCardName ?? candidate.accountName ?? "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${isIncome ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(candidate.amount)}
                    </TableCell>
                    <TableCell>{confidenceBadge(candidate.confidence)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <CandidateEditDialog
                          candidate={candidate}
                          categories={categories}
                          subcategories={subcategories}
                          merchants={merchants}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Excluir"
                          disabled={isPending}
                          onClick={() => deleteOne({ fileId: candidate.fileId, index: candidate.index })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
