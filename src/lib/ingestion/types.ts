export const TRANSACTION_TYPES = [
  "receita",
  "despesa",
  "transferencia",
  "pagamento_fatura",
  "estorno",
  "reembolso",
  "cashback",
  "tarifa",
  "juros",
  "iof",
  "imposto",
  "saque",
  "deposito",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === "string" && (TRANSACTION_TYPES as readonly string[]).includes(value);
}

export type ExtractedRow = {
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number; // always positive
  type: TransactionType;
  raw: Record<string, unknown>;
  category_id?: string | null;
  subcategory_id?: string | null;
  merchant_id?: string | null;
  cost_center_id?: string | null;
};

export type ParseResult =
  | { ok: true; rows: ExtractedRow[] }
  | { ok: false; error: string };
