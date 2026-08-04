import ExcelJS from "exceljs";
import { parseAmount, parseDate } from "@/lib/ingestion/number-utils";
import { COLUMN_PATTERNS, findHeaderIndex } from "@/lib/ingestion/column-matcher";
import type { ParseResult, ExtractedRow } from "@/lib/ingestion/types";

function cellToText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  return String(value);
}

export async function parseXlsx(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return { ok: false, error: "Não foi possível ler o arquivo Excel." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { ok: false, error: "A planilha está vazia." };
  }

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values = row.values as ExcelJS.CellValue[];
    rows.push(values.slice(1).map(cellToText));
  });

  if (rows.length < 2) {
    return { ok: false, error: "Nenhuma linha de dados encontrada na planilha." };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const dateIndex = findHeaderIndex(headers, COLUMN_PATTERNS.date);
  const descriptionIndex = findHeaderIndex(headers, COLUMN_PATTERNS.description);
  const amountIndex = findHeaderIndex(headers, COLUMN_PATTERNS.amount);
  const creditIndex = findHeaderIndex(headers, COLUMN_PATTERNS.credit);
  const debitIndex = findHeaderIndex(headers, COLUMN_PATTERNS.debit);

  if (dateIndex === -1 || (amountIndex === -1 && creditIndex === -1 && debitIndex === -1)) {
    return {
      ok: false,
      error: "Não foi possível identificar as colunas de data e valor nesta planilha.",
    };
  }

  const extracted: ExtractedRow[] = [];

  for (const row of dataRows) {
    const date = parseDate(row[dateIndex]);
    if (!date) continue;

    let amount: number | null = null;
    let type: "receita" | "despesa" = "despesa";

    if (amountIndex !== -1) {
      const value = parseAmount(row[amountIndex]);
      if (value != null && value !== 0) {
        amount = Math.abs(value);
        type = value < 0 ? "despesa" : "receita";
      }
    } else {
      const credit = creditIndex !== -1 ? parseAmount(row[creditIndex]) : null;
      const debit = debitIndex !== -1 ? parseAmount(row[debitIndex]) : null;
      if (credit) {
        amount = Math.abs(credit);
        type = "receita";
      } else if (debit) {
        amount = Math.abs(debit);
        type = "despesa";
      }
    }

    if (amount == null) continue;

    extracted.push({
      date,
      description: descriptionIndex !== -1 ? row[descriptionIndex]?.trim() || "Sem descrição" : "Sem descrição",
      amount,
      type,
      raw: Object.fromEntries(headers.map((header, index) => [header || `col_${index}`, row[index]])),
    });
  }

  if (extracted.length === 0) {
    return { ok: false, error: "Nenhuma transação válida encontrada na planilha." };
  }

  return { ok: true, rows: extracted };
}
