"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectReconciliationItems } from "@/lib/actions/reconciliation";

export function DetectReconciliationButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await detectReconciliationItems();
          if (result.found > 0) {
            toast.success(`${result.found} possível(is) pendência(s) encontrada(s).`);
          } else {
            toast.info("Nenhuma pendência nova identificada nos últimos 6 meses.");
          }
        })
      }
    >
      <Sparkles className="h-4 w-4" />
      {isPending ? "Analisando..." : "Detectar pendências"}
    </Button>
  );
}
