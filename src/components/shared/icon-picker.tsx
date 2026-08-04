"use client";

import { createElement } from "react";
import { ICON_OPTIONS, getIcon } from "@/lib/icon-options";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function IconPicker({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
}) {
  const items = ICON_OPTIONS.map((option) => ({ value: option.value, label: option.label }));

  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)} name={name} items={items}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          {createElement(getIcon(value), { className: "h-4 w-4" })}
          <SelectValue placeholder="Ícone" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {ICON_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {option.label}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
