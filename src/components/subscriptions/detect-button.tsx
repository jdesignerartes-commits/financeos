"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectSubscriptions } from "@/lib/actions/subscriptions";

export function DetectButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await detectSubscriptions();
          if (result.found > 0) {
            toast.success(`${result.found} possível(is) assinatura(s) encontrada(s).`);
          } else {
            toast.info("Nenhuma assinatura nova identificada nas transações confirmadas.");
          }
        })
      }
    >
      <Sparkles className="h-4 w-4" />
      {isPending ? "Analisando..." : "Detectar assinaturas"}
    </Button>
  );
}
