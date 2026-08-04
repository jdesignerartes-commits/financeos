import Papa from "papaparse";
import { parseAmount, parseDate } from "@/lib/ingestion/number-utils";
import { COLUMN_PATTERNS, findHeaderIndex } from "@/lib/ingestion/column-matcher";
import type { ParseResult, ExtractedRow } from "@/lib/ingestion/types";

export function parseCsv(text: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  const rows = result.data.filter((row) => Object.keys(row).length > 0);
  if (rows.length === 0) {
    return { ok: false, error: "Nenhuma linha de dados encontrada no CSV." };
  }

  const headers = Object.keys(rows[0]);
  const dateKey = headers[findHeaderIndex(headers, COLUMN_PATTERNS.date)];
  const descriptionKey = headers[findHeaderIndex(headers, COLUMN_PATTERNS.description)];
  const amountKey = headers[findHeaderIndex(headers, COLUMN_PATTERNS.amount)];
  const creditKey = headers[findHeaderIndex(headers, COLUMN_PATTERNS.credit)];
  const debitKey = headers[findHeaderIndex(headers, COLUMN_PATTERNS.debit)];

  if (!dateKey || !(amountKey || creditKey || debitKey)) {
    return {
      ok: false,
      error: "Não foi possível identificar as colunas de data e valor neste CSV.",
    };
  }

  const extracted: ExtractedRow[] = [];

  for (const row of rows) {
    const date = parseDate(row[dateKey]);
    if (!date) continue;

    let amount: number | null = null;
    let type: "receita" | "despesa" = "despesa";

    if (amountKey) {
      const value = parseAmount(row[amountKey]);
      if (value != null && value !== 0) {
        amount = Math.abs(value);
        type = value < 0 ? "despesa" : "receita";
      }
    } else {
      const credit = creditKey ? parseAmount(row[creditKey]) : null;
      const debit = debitKey ? parseAmount(row[debitKey]) : null;
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
      description: descriptionKey ? String(row[descriptionKey] ?? "").trim() : "Sem descrição",
      amount,
      type,
      raw: row,
    });
  }

  if (extracted.length === 0) {
    return { ok: false, error: "Nenhuma transação válida encontrada no CSV." };
  }

  return { ok: true, rows: extracted };
}
