export function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export const COLUMN_PATTERNS = {
  date: ["data", "date", "dt lancamento", "dt"],
  description: ["descri", "historic", "lancamento", "memo", "title"],
  amount: ["valor", "amount", "montante"],
  credit: ["credito"],
  debit: ["debito"],
};

export function findHeaderIndex(headers: string[], patterns: string[]) {
  return headers.findIndex((header) => {
    const normalized = normalizeHeader(header);
    return patterns.some((pattern) => normalized.includes(pattern));
  });
}
