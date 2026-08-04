import { createClient } from "@/lib/supabase/server";
import { ReviewTable } from "@/components/review/review-table";
import { Card, CardContent } from "@/components/ui/card";
import type { ExtractedRow } from "@/lib/ingestion/types";
import type { ReviewCandidate } from "@/lib/review-types";

export default async function RevisaoPage() {
  const supabase = await createClient();

  const { data: files } = await supabase
    .from("imported_files")
    .select("*")
    .eq("status", "revisao_necessaria")
    .order("created_at", { ascending: false });

  const [
    { data: categories },
    { data: subcategories },
    { data: accounts },
    { data: creditCards },
    { data: merchants },
    { data: existingTx },
  ] = await Promise.all([
    supabase.from("categories").select("*").eq("status", "ativa").order("sort_order"),
    supabase.from("subcategories").select("*").eq("status", "ativa").order("name"),
    supabase.from("accounts").select("id, name"),
    supabase.from("credit_cards").select("id, name"),
    supabase.from("merchants").select("id, display_name").order("display_name"),
    supabase.from("transactions").select("date, amount, account_id, credit_card_id"),
  ]);

  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const creditCardNameById = new Map((creditCards ?? []).map((c) => [c.id, c.name]));

  const existingKeySet = new Set(
    (existingTx ?? []).map((t) => `${t.date}|${t.amount}|${t.account_id ?? ""}|${t.credit_card_id ?? ""}`),
  );

  const candidates: ReviewCandidate[] = [];

  if (files?.length) {
    const fileIds = files.map((f) => f.id);
    const { data: extractions } = await supabase
      .from("raw_extractions")
      .select("imported_file_id, raw_data, confidence")
      .in("imported_file_id", fileIds)
      .order("created_at", { ascending: false });

    const extractionByFile = new Map<string, { raw_data: unknown; confidence: number | null }>();
    for (const extraction of extractions ?? []) {
      if (!extractionByFile.has(extraction.imported_file_id)) {
        extractionByFile.set(extraction.imported_file_id, extraction);
      }
    }

    const candidateKeyCounts = new Map<string, number>();
    for (const file of files) {
      const extraction = extractionByFile.get(file.id);
      if (!extraction) continue;
      const rows = (extraction.raw_data as ExtractedRow[]) ?? [];
      for (const row of rows) {
        const key = `${row.date}|${row.amount}|${file.account_id ?? ""}|${file.credit_card_id ?? ""}`;
        candidateKeyCounts.set(key, (candidateKeyCounts.get(key) ?? 0) + 1);
      }
    }

    for (const file of files) {
      const extraction = extractionByFile.get(file.id);
      if (!extraction) continue;
      const rows = (extraction.raw_data as ExtractedRow[]) ?? [];

      rows.forEach((row, index) => {
        const key = `${row.date}|${row.amount}|${file.account_id ?? ""}|${file.credit_card_id ?? ""}`;
        candidates.push({
          fileId: file.id,
          index,
          fileName: file.file_name,
          date: row.date,
          description: row.description,
          amount: row.amount,
          type: row.type,
          categoryId: row.category_id ?? null,
          subcategoryId: row.subcategory_id ?? null,
          merchantId: row.merchant_id ?? null,
          confidence: extraction.confidence,
          isPossibleDuplicate: existingKeySet.has(key) || (candidateKeyCounts.get(key) ?? 0) > 1,
          accountName: file.account_id ? accountNameById.get(file.account_id) ?? null : null,
          creditCardName: file.credit_card_id ? creditCardNameById.get(file.credit_card_id) ?? null : null,
        });
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisão</h1>
        <p className="text-sm text-muted-foreground">
          Confira as transações extraídas antes de confirmá-las. Itens com baixa confiança ou possível duplicidade
          aparecem destacados.
        </p>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhuma transação aguardando revisão no momento. Envie um arquivo em Importações para começar.
          </CardContent>
        </Card>
      ) : (
        <ReviewTable
          candidates={candidates}
          categories={categories ?? []}
          subcategories={subcategories ?? []}
          merchants={merchants ?? []}
        />
      )}
    </div>
  );
}
