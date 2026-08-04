import { parseAmount, parseDate } from "@/lib/ingestion/number-utils";
import type { ParseResult, ExtractedRow } from "@/lib/ingestion/types";

const LINE_PATTERN = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+(-?[\d.,]+)\s*([DC])?\s*$/;

export const MIN_NATIVE_TEXT_LENGTH = 40;

export function parsePdfStatementText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: ExtractedRow[] = [];

  for (const line of lines) {
    const match = line.match(LINE_PATTERN);
    if (!match) continue;

    const [, rawDate, rawDescription, rawAmount, suffix] = match;
    const date = parseDate(rawDate);
    const amount = parseAmount(rawAmount);
    if (!date || amount == null || amount === 0) continue;

    let type: "receita" | "despesa" = amount < 0 ? "despesa" : "receita";
    if (suffix === "D") type = "despesa";
    if (suffix === "C") type = "receita";

    rows.push({
      date,
      description: rawDescription.trim() || "Sem descrição",
      amount: Math.abs(amount),
      type,
      raw: { line },
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: "Não foi possível identificar transações no texto do PDF.",
    };
  }

  return { ok: true, rows };
}
