import type { TransactionType } from "@/lib/ingestion/types";

export type ReviewCandidate = {
  fileId: string;
  index: number;
  fileName: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  subcategoryId: string | null;
  merchantId: string | null;
  confidence: number | null;
  isPossibleDuplicate: boolean;
  accountName: string | null;
  creditCardName: string | null;
};
