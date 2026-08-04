"use client";

import { useTransition } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton({ action }: { action: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Tentar novamente"
      disabled={isPending}
      onClick={() => startTransition(action)}
    >
      <RotateCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
    </Button>
  );
}
