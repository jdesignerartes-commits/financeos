import Anthropic from "@anthropic-ai/sdk";
import type { ParseResult, ExtractedRow } from "@/lib/ingestion/types";

const EXTRACT_TOOL = {
  name: "extract_transactions",
  description:
    "Registra as transações financeiras encontradas na imagem. Use apenas dados realmente visíveis no documento — nunca invente ou estime valores, datas ou descrições ausentes.",
  input_schema: {
    type: "object" as const,
    properties: {
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data da transação no formato YYYY-MM-DD" },
            description: { type: "string", description: "Descrição ou estabelecimento, como aparece no documento" },
            amount: { type: "number", description: "Valor absoluto (sempre positivo)" },
            type: { type: "string", enum: ["receita", "despesa"] },
          },
          required: ["date", "description", "amount", "type"],
        },
      },
    },
    required: ["transactions"],
  },
};

type ExtractedPayload = {
  transactions?: Array<{
    date?: unknown;
    description?: unknown;
    amount?: unknown;
    type?: unknown;
  }>;
};

export function isVisionConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function extractFromVisualDocument(base64: string, mediaType: string): Promise<ParseResult> {
  if (!isVisionConfigured()) {
    return {
      ok: false,
      error: "OCR não configurado: falta definir ANTHROPIC_API_KEY no servidor.",
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const isPdf = mediaType === "application/pdf";

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_transactions" },
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: base64 },
                }
              : {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType as "image/jpeg" | "image/png",
                    data: base64,
                  },
                },
            {
              type: "text",
              text: "Este documento é um comprovante, extrato ou fatura financeira brasileira (possivelmente escaneada). Identifique cada transação visível (data, descrição/estabelecimento, valor e se é receita ou despesa). Se não conseguir ler algum campo com confiança, não invente — apenas não inclua a transação. Se não houver um documento financeiro legível, retorne uma lista vazia.",
            },
          ],
        },
      ],
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `Falha ao consultar OCR: ${error.message}` : "Falha ao consultar OCR.",
    };
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { ok: false, error: "O OCR não retornou um resultado estruturado." };
  }

  const payload = toolUse.input as ExtractedPayload;
  const rows: ExtractedRow[] = [];

  for (const item of payload.transactions ?? []) {
    const date = typeof item.date === "string" ? item.date.slice(0, 10) : null;
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const amount = typeof item.amount === "number" ? Math.abs(item.amount) : null;
    const type = item.type === "receita" ? "receita" : item.type === "despesa" ? "despesa" : null;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || amount == null || amount === 0 || !type) continue;

    rows.push({
      date,
      description: description || "Sem descrição",
      amount,
      type,
      raw: item as Record<string, unknown>,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "Nenhuma transação identificada com confiança suficiente na imagem." };
  }

  return { ok: true, rows };
}
