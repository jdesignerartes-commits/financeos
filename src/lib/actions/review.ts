"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTransactionType, type ExtractedRow } from "@/lib/ingestion/types";

export type CandidateRef = { fileId: string; index: number };
export type FormState = { error?: string } | undefined;

function groupByFile(refs: CandidateRef[]) {
  const map = new Map<string, number[]>();
  for (const ref of refs) {
    const list = map.get(ref.fileId) ?? [];
    list.push(ref.index);
    map.set(ref.fileId, list);
  }
  return map;
}

async function loadRawExtraction(supabase: Awaited<ReturnType<typeof createClient>>, fileId: string) {
  const { data } = await supabase
    .from("raw_extractions")
    .select("id, raw_data")
    .eq("imported_file_id", fileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { rawExtractionId: data.id as string, rows: ((data.raw_data as ExtractedRow[]) ?? []) };
}

async function finalizeFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileId: string,
  rawExtractionId: string,
  remainingRows: ExtractedRow[],
) {
  if (remainingRows.length === 0) {
    await supabase.from("raw_extractions").delete().eq("id", rawExtractionId);
    await supabase.from("imported_files").update({ status: "concluido" }).eq("id", fileId);
  } else {
    await supabase.from("raw_extractions").update({ raw_data: remainingRows }).eq("id", rawExtractionId);
  }
}

function parseRefs(formData: FormData): CandidateRef[] {
  const raw = formData.get("refs");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function orNull(value: FormDataEntryValue | null) {
  return !value || value === "none" ? null : String(value);
}

async function learnAlias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rawText: string,
  merchantId: string,
) {
  const trimmed = rawText.trim();
  if (!trimmed) return;
  await supabase
    .from("merchant_aliases")
    .upsert({ user_id: userId, merchant_id: merchantId, raw_text: trimmed }, { onConflict: "user_id,raw_text" });
}

export async function confirmCandidates(refs: CandidateRef[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const byFile = groupByFile(refs);
  const errors: string[] = [];

  for (const [fileId, indices] of byFile) {
    const { data: file } = await supabase
      .from("imported_files")
      .select("account_id, credit_card_id")
      .eq("id", fileId)
      .single();
    if (!file) continue;

    const loaded = await loadRawExtraction(supabase, fileId);
    if (!loaded) continue;

    const indexSet = new Set(indices);
    const toConfirm = loaded.rows.filter((_, i) => indexSet.has(i));
    const remaining = loaded.rows.filter((_, i) => !indexSet.has(i));

    if (toConfirm.length > 0) {
      const { error } = await supabase.from("transactions").insert(
        toConfirm.map((row) => ({
          user_id: user.id,
          account_id: file.account_id,
          credit_card_id: file.credit_card_id,
          date: row.date,
          original_description: row.description,
          friendly_description: row.description,
          amount: row.amount,
          type: row.type,
          category_id: row.category_id ?? null,
          subcategory_id: row.subcategory_id ?? null,
          merchant_id: row.merchant_id ?? null,
          cost_center_id: row.cost_center_id ?? null,
          imported_file_id: fileId,
          status: "confirmada",
        })),
      );

      if (error) {
        errors.push(`Não foi possível confirmar ${toConfirm.length} transação(ões): ${error.message}`);
        continue;
      }
    }

    await finalizeFile(supabase, fileId, loaded.rawExtractionId, remaining);
  }

  revalidatePath("/revisao");
  revalidatePath("/transacoes");
  revalidatePath("/importacoes");

  return errors.length > 0 ? { error: errors.join(" · ") } : {};
}

export async function deleteCandidates(refs: CandidateRef[]) {
  const supabase = await createClient();
  const byFile = groupByFile(refs);

  for (const [fileId, indices] of byFile) {
    const loaded = await loadRawExtraction(supabase, fileId);
    if (!loaded) continue;

    const indexSet = new Set(indices);
    const remaining = loaded.rows.filter((_, i) => !indexSet.has(i));

    await finalizeFile(supabase, fileId, loaded.rawExtractionId, remaining);
  }

  revalidatePath("/revisao");
  revalidatePath("/importacoes");
}

export async function updateCandidate(
  fileId: string,
  index: number,
  patch: Partial<
    Pick<
      ExtractedRow,
      "date" | "description" | "amount" | "type" | "category_id" | "subcategory_id" | "merchant_id"
    >
  >,
) {
  const supabase = await createClient();
  const loaded = await loadRawExtraction(supabase, fileId);
  if (!loaded) return;

  const rows = loaded.rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
  await supabase.from("raw_extractions").update({ raw_data: rows }).eq("id", loaded.rawExtractionId);
  revalidatePath("/revisao");
}

export async function updateCandidateAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fileId = String(formData.get("fileId") ?? "");
  const index = Number(formData.get("index"));
  const date = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const typeValue = formData.get("type");
  const type = isTransactionType(typeValue) ? typeValue : "despesa";
  const categoryId = orNull(formData.get("category_id"));
  const subcategoryId = orNull(formData.get("subcategory_id"));
  const merchantId = orNull(formData.get("merchant_id"));

  if (!fileId || Number.isNaN(index) || !date || !description || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Preencha data, descrição e valor corretamente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const loaded = await loadRawExtraction(supabase, fileId);
  const previous = loaded?.rows[index];

  await updateCandidate(fileId, index, {
    date,
    description,
    amount,
    type,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    merchant_id: merchantId,
  });

  if (merchantId && merchantId !== (previous?.merchant_id ?? null)) {
    await learnAlias(supabase, user.id, previous?.description ?? description, merchantId);
  }
}

export async function bulkSetCategoryAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const refs = parseRefs(formData);
  if (refs.length === 0) {
    return { error: "Nenhuma transação selecionada." };
  }

  const categoryId = orNull(formData.get("category_id"));
  const subcategoryId = orNull(formData.get("subcategory_id"));

  const supabase = await createClient();
  const byFile = groupByFile(refs);

  for (const [fileId, indices] of byFile) {
    const loaded = await loadRawExtraction(supabase, fileId);
    if (!loaded) continue;

    const indexSet = new Set(indices);
    const rows = loaded.rows.map((row, i) =>
      indexSet.has(i) ? { ...row, category_id: categoryId, subcategory_id: subcategoryId } : row,
    );
    await supabase.from("raw_extractions").update({ raw_data: rows }).eq("id", loaded.rawExtractionId);
  }

  revalidatePath("/revisao");
}
