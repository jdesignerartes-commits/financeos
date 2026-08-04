"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function IconActionButton({
  children,
  label,
  action,
  variant = "ghost",
}: {
  children: React.ReactNode;
  label: string;
  action: () => Promise<void>;
  variant?: "ghost" | "outline";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size="icon-sm"
      aria-label={label}
      disabled={isPending}
      onClick={() => startTransition(action)}
    >
      {children}
    </Button>
  );
}
