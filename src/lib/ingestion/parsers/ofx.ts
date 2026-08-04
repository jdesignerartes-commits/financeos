import { parseAmount, parseDate } from "@/lib/ingestion/number-utils";
import type { ParseResult, ExtractedRow } from "@/lib/ingestion/types";

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
  return match ? match[1].trim() : null;
}

export function parseOfx(text: string): ParseResult {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi);
  if (!blocks || blocks.length === 0) {
    return { ok: false, error: "Nenhuma transação encontrada no arquivo OFX." };
  }

  const rows: ExtractedRow[] = [];

  for (const block of blocks) {
    const dtPosted = extractTag(block, "DTPOSTED");
    const trnAmt = extractTag(block, "TRNAMT");
    const memo = extractTag(block, "MEMO") ?? extractTag(block, "NAME") ?? "";

    const date = parseDate(dtPosted);
    const amount = parseAmount(trnAmt);

    if (!date || amount == null || amount === 0) continue;

    rows.push({
      date,
      description: memo || "Sem descrição",
      amount: Math.abs(amount),
      type: amount < 0 ? "despesa" : "receita",
      raw: {
        trntype: extractTag(block, "TRNTYPE"),
        fitid: extractTag(block, "FITID"),
        dtposted: dtPosted,
        trnamt: trnAmt,
        memo,
      },
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "Não foi possível extrair transações válidas do OFX." };
  }

  return { ok: true, rows };
}
