export type TransactionType =
  | "receita"
  | "despesa"
  | "transferencia"
  | "pagamento_fatura"
  | "estorno"
  | "reembolso"
  | "cashback"
  | "tarifa"
  | "juros"
  | "iof"
  | "imposto"
  | "saque"
  | "deposito";

export const TRANSACTION_DIRECTION: Record<TransactionType, 1 | -1 | 0> = {
  receita: 1,
  despesa: -1,
  transferencia: 0,
  pagamento_fatura: -1,
  estorno: 1,
  reembolso: 1,
  cashback: 1,
  tarifa: -1,
  juros: -1,
  iof: -1,
  imposto: -1,
  saque: -1,
  deposito: 1,
};

export function signedAmount(type: string, amount: number): number {
  const direction = TRANSACTION_DIRECTION[type as TransactionType] ?? 0;
  return direction * amount;
}

export type ReconciliationTransaction = {
  id: string;
  date: string;
  amount: number;
  type: string;
  account_id: string | null;
  credit_card_id: string | null;
  description: string;
};

export function computeCalculatedBalance(
  transactions: Pick<ReconciliationTransaction, "type" | "amount">[],
  initialBalance: number,
): number {
  return transactions.reduce((acc, t) => acc + signedAmount(t.type, t.amount), initialBalance);
}

export type CandidatePair = {
  transaction: ReconciliationTransaction;
  relatedTransaction: ReconciliationTransaction;
  type: "duplicidade" | "transferencia_interna";
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DAY_MS;
}

function originOf(t: Pick<ReconciliationTransaction, "account_id" | "credit_card_id">) {
  return t.account_id ?? t.credit_card_id;
}

export function findDuplicateCandidates(transactions: ReconciliationTransaction[]): CandidatePair[] {
  const pairs: CandidatePair[] = [];
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const a = transactions[i];
      const b = transactions[j];
      if (a.amount !== b.amount) continue;
      if (a.type !== b.type) continue;
      if (originOf(a) !== originOf(b) || !originOf(a)) continue;
      if (daysBetween(a.date, b.date) > 2) continue;
      pairs.push({ transaction: a, relatedTransaction: b, type: "duplicidade" });
    }
  }
  return pairs;
}

export function findTransferCandidates(transactions: ReconciliationTransaction[]): CandidatePair[] {
  const eligible = transactions.filter(
    (t) => t.type === "despesa" || t.type === "receita" || t.type === "transferencia",
  );
  const pairs: CandidatePair[] = [];

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i];
      const b = eligible[j];
      if (a.amount !== b.amount) continue;

      const originA = originOf(a);
      const originB = originOf(b);
      if (!originA || !originB || originA === originB) continue;
      if (daysBetween(a.date, b.date) > 3) continue;

      const bothTransfer = a.type === "transferencia" && b.type === "transferencia";
      const oppositeDirection =
        (a.type === "despesa" && b.type === "receita") || (a.type === "receita" && b.type === "despesa");
      const oneTransferOther =
        (a.type === "transferencia" && (b.type === "despesa" || b.type === "receita")) ||
        (b.type === "transferencia" && (a.type === "despesa" || a.type === "receita"));

      if (!bothTransfer && !oppositeDirection && !oneTransferOther) continue;

      pairs.push({ transaction: a, relatedTransaction: b, type: "transferencia_interna" });
    }
  }

  return pairs;
}
