"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/form-dialog";
import { saveAlias } from "@/lib/actions/merchants";

export function AliasDialog({ merchantId }: { merchantId: string }) {
  return (
    <FormDialog
      trigger={
        <Button type="button" variant="outline" size="xs">
          <Plus className="h-3 w-3" />
          Alias
        </Button>
      }
      title="Novo alias"
      description="Outra forma como esta empresa aparece em extratos e faturas."
      action={saveAlias}
    >
      <input type="hidden" name="merchant_id" value={merchantId} />
      <div className="space-y-2">
        <Label htmlFor="raw_text">Texto no extrato</Label>
        <Input id="raw_text" name="raw_text" required placeholder="Ex: AMAZON MKTPLACE" />
      </div>
    </FormDialog>
  );
}
