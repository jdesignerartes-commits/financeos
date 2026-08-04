"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadImportedFiles } from "@/lib/actions/imports";
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from "@/lib/import-constraints";
import { IMPORT_ORIGIN_LABELS, toSelectItems } from "@/lib/labels";
import type { Database } from "@/types/database";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];

const NONE = "none";
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDropzone({
  accounts,
  creditCards,
}: {
  accounts: Pick<Account, "id" | "name">[];
  creditCards: Pick<CreditCard, "id" | "name">[];
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [origin, setOrigin] = useState(NONE);
  const [accountId, setAccountId] = useState(NONE);
  const [creditCardId, setCreditCardId] = useState(NONE);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasPending = useRef(false);

  const [state, formAction, isPending] = useActionState(uploadImportedFiles, undefined);

  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (state?.error) {
        toast.error(state.error, {
          description: state.successCount ? `${state.successCount} arquivo(s) enviados com sucesso.` : undefined,
        });
      } else if (state?.successCount) {
        toast.success(`${state.successCount} arquivo(s) enviados.`);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local staging list after a successful upload action
        setFiles([]);
      }
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const merged = [...prev];
      for (const file of incoming) {
        const key = `${file.name}-${file.size}`;
        if (!existingKeys.has(key)) {
          merged.push(file);
          existingKeys.add(key);
        }
      }
      return merged;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(formData: FormData) {
    files.forEach((file) => formData.append("files", file));
    formAction(formData);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Arraste os arquivos aqui ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground">
          PDF, JPG, PNG, CSV, OFX, XLS, XLSX — até {formatSize(MAX_FILE_SIZE)} cada
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <form action={handleSubmit} className="space-y-4">
          <ul className="divide-y rounded-lg border">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 p-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatSize(file.size)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remover"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select
                value={origin}
                onValueChange={(v) => setOrigin(v ?? NONE)}
                name="origin"
                items={[{ value: NONE, label: "Não informada" }, ...toSelectItems(IMPORT_ORIGIN_LABELS)]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informada</SelectItem>
                  {Object.entries(IMPORT_ORIGIN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Select
                value={accountId}
                onValueChange={(v) => setAccountId(v ?? NONE)}
                name="account_id"
                items={[{ value: NONE, label: "Nenhuma" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhuma</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cartão</Label>
              <Select
                value={creditCardId}
                onValueChange={(v) => setCreditCardId(v ?? NONE)}
                name="credit_card_id"
                items={[{ value: NONE, label: "Nenhum" }, ...creditCards.map((c) => ({ value: c.id, label: c.name }))]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Enviando..." : `Enviar ${files.length} arquivo(s)`}
          </Button>
        </form>
      )}
    </div>
  );
}
