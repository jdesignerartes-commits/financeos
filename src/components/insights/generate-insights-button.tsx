"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateInsights } from "@/lib/actions/insights";

export function GenerateInsightsButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled || isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await generateInsights();
          if (result?.error) {
            toast.error(result.error);
          } else {
            toast.success("Nova análise gerada.");
          }
        })
      }
    >
      <Sparkles className="h-4 w-4" />
      {isPending ? "Gerando..." : "Gerar nova análise"}
    </Button>
  );
}
