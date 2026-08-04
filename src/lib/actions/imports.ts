"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from "@/lib/import-constraints";
import { parseCsv } from "@/lib/ingestion/parsers/csv";
import { parseOfx } from "@/lib/ingestion/parsers/ofx";
import { parseXlsx } from "@/lib/ingestion/parsers/xlsx";
import { extractPdfText } from "@/lib/ingestion/parsers/pdf-text";
import { parsePdfStatementText, MIN_NATIVE_TEXT_LENGTH } from "@/lib/ingestion/parsers/pdf-statement";
import { extractFromVisualDocument } from "@/lib/ingestion/vision/claude-vision";
import { matchMerchantId } from "@/lib/ingestion/merchant-matcher";
import { applyRules } from "@/lib/ingestion/rules-engine";
import type { ParseResult, ExtractedRow } from "@/lib/ingestion/types";

export type UploadState = { error?: string; successCount?: number } | undefined;

const AUTO_PROCESS_EXTENSIONS = ["csv", "ofx", "xlsx", "xls", "pdf", "jpg", "jpeg", "png"];

const IMAGE_MEDIA_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function orNull(value: FormDataEntryValue | null) {
  return !value || value === "none" ? null : String(value);
}

export async function uploadImportedFiles(_prevState: UploadState, formData: FormData): Promise<UploadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) {
    return { error: "Selecione ao menos um arquivo." };
  }

  const origin = orNull(formData.get("origin"));
  const accountId = orNull(formData.get("account_id"));
  const creditCardId = orNull(formData.get("credit_card_id"));

  const errors: string[] = [];
  let successCount = 0;

  for (const file of files) {
    const extension = getExtension(file.name);

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      errors.push(`${file.name}: formato não suportado`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: maior que 15 MB`);
      continue;
    }

    const storagePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(storagePath, file, { contentType: file.type || undefined });

    if (uploadError) {
      errors.push(`${file.name}: falha no envio`);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("imported_files")
      .insert({
        user_id: user.id,
        account_id: accountId,
        credit_card_id: creditCardId,
        file_name: file.name,
        file_type: extension,
        file_size: file.size,
        storage_path: storagePath,
        origin,
        status: "aguardando",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      errors.push(`${file.name}: falha ao registrar`);
      await supabase.storage.from("documentos").remove([storagePath]);
      continue;
    }

    successCount += 1;

    if (AUTO_PROCESS_EXTENSIONS.includes(extension)) {
      await processImportedFile(inserted.id);
    }
  }

  revalidatePath("/importacoes");

  if (errors.length > 0) {
    return { error: errors.join(" · "), successCount };
  }

  return { successCount };
}

async function enrichRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: ExtractedRow[],
  accountId: string | null,
  creditCardId: string | null,
): Promise<ExtractedRow[]> {
  const [{ data: aliases }, { data: merchants }, { data: rules }, { data: account }, { data: creditCard }] =
    await Promise.all([
      supabase.from("merchant_aliases").select("raw_text, merchant_id"),
      supabase.from("merchants").select("id, category_id, subcategory_id"),
      supabase.from("automation_rules").select("*").eq("status", "ativa"),
      accountId ? supabase.from("accounts").select("name").eq("id", accountId).single() : Promise.resolve({ data: null }),
      creditCardId
        ? supabase.from("credit_cards").select("name").eq("id", creditCardId).single()
        : Promise.resolve({ data: null }),
    ]);

  const merchantById = new Map((merchants ?? []).map((m) => [m.id, m]));

  const withMerchants = rows.map((row) => {
    const merchantId = matchMerchantId(row.description, aliases ?? []);
    if (!merchantId) return row;
    const merchant = merchantById.get(merchantId);
    return {
      ...row,
      merchant_id: merchantId,
      category_id: row.category_id ?? merchant?.category_id ?? null,
      subcategory_id: row.subcategory_id ?? merchant?.subcategory_id ?? null,
    };
  });

  return applyRules(withMerchants, rules ?? [], {
    accountName: account?.name,
    creditCardName: creditCard?.name,
  });
}

export async function processImportedFile(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: file } = await supabase.from("imported_files").select("*").eq("id", id).single();
  if (!file) return;

  await supabase.from("imported_files").update({ status: "processando", error_message: null }).eq("id", id);

  const { data: blob, error: downloadError } = await supabase.storage
    .from("documentos")
    .download(file.storage_path);

  if (downloadError || !blob) {
    await supabase
      .from("imported_files")
      .update({
        status: "falhou",
        error_message: "Não foi possível baixar o arquivo enviado.",
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    revalidatePath("/importacoes");
    return;
  }

  let result: ParseResult;
  let extractionMethod: string;
  let rawText: string | null = null;
  let confidence = 1;

  switch (file.file_type) {
    case "csv": {
      rawText = await blob.text();
      result = parseCsv(rawText);
      extractionMethod = "nativo_csv";
      break;
    }
    case "ofx": {
      rawText = await blob.text();
      result = parseOfx(rawText);
      extractionMethod = "nativo_ofx";
      break;
    }
    case "xlsx": {
      const buffer = Buffer.from(await blob.arrayBuffer());
      result = await parseXlsx(buffer);
      extractionMethod = "nativo_xlsx";
      break;
    }
    case "xls": {
      result = {
        ok: false,
        error: "Formato .xls (Excel antigo) ainda não é suportado — salve como .xlsx e envie novamente.",
      };
      extractionMethod = "nativo_xls";
      break;
    }
    case "pdf": {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const nativeText = await extractPdfText(buffer).catch(() => "");

      if (nativeText.trim().length >= MIN_NATIVE_TEXT_LENGTH) {
        rawText = nativeText;
        result = parsePdfStatementText(nativeText);
        extractionMethod = "texto_pdf";
        confidence = 0.9;
      } else {
        const base64 = buffer.toString("base64");
        result = await extractFromVisualDocument(base64, "application/pdf");
        extractionMethod = "ocr_ia";
        confidence = 0.7;
      }
      break;
    }
    case "jpg":
    case "jpeg":
    case "png": {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const base64 = buffer.toString("base64");
      result = await extractFromVisualDocument(base64, IMAGE_MEDIA_TYPES[file.file_type]);
      extractionMethod = "ocr_ia";
      confidence = 0.7;
      break;
    }
    default: {
      result = { ok: false, error: "A leitura deste tipo de arquivo chega em um próximo módulo." };
      extractionMethod = "pendente";
    }
  }

  if (!result.ok) {
    await supabase
      .from("imported_files")
      .update({
        status: "falhou",
        error_message: result.error,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    revalidatePath("/importacoes");
    return;
  }

  const enrichedRows = await enrichRows(supabase, result.rows, file.account_id, file.credit_card_id);

  await supabase.from("raw_extractions").delete().eq("imported_file_id", id);

  await supabase.from("raw_extractions").insert({
    user_id: user.id,
    imported_file_id: id,
    raw_text: rawText,
    raw_data: enrichedRows,
    extraction_method: extractionMethod,
    confidence,
  });

  await supabase
    .from("imported_files")
    .update({
      status: "revisao_necessaria",
      transactions_found: enrichedRows.length,
      errors_found: 0,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/importacoes");
}

export async function retryImportedFile(id: string) {
  await processImportedFile(id);
}

export async function deleteImportedFile(id: string, storagePath: string) {
  const supabase = await createClient();
  await supabase.storage.from("documentos").remove([storagePath]);
  await supabase.from("imported_files").delete().eq("id", id);
  revalidatePath("/importacoes");
}
