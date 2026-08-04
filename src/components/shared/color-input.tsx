"use client";

import { Input } from "@/components/ui/input";

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
        aria-label="Cor"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#000000"
        className="font-mono"
      />
    </div>
  );
}
