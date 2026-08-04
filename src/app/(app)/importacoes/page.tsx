import { createClient } from "@/lib/supabase/server";
import { retryImportedFile, deleteImportedFile } from "@/lib/actions/imports";
import { UploadDropzone } from "@/components/imports/upload-dropzone";
import { DeleteButton } from "@/components/shared/delete-button";
import { RetryButton } from "@/components/shared/retry-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IMPORT_ORIGIN_LABELS, IMPORT_STATUS_LABELS } from "@/lib/labels";
import type { Database } from "@/types/database";

type ImportedFile = Database["public"]["Tables"]["imported_files"]["Row"];

const STATUS_VARIANT: Record<ImportedFile["status"], "default" | "secondary" | "destructive" | "outline"> = {
  aguardando: "outline",
  processando: "secondary",
  revisao_necessaria: "secondary",
  concluido: "default",
  falhou: "destructive",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ImportacoesPage() {
  const supabase = await createClient();
  const [{ data: files }, { data: accounts }, { data: creditCards }] = await Promise.all([
    supabase.from("imported_files").select("*").order("created_at", { ascending: false }),
    supabase.from("accounts").select("id, name").eq("status", "ativa").order("name"),
    supabase.from("credit_cards").select("id, name").eq("status", "ativo").order("name"),
  ]);

  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const creditCardNameById = new Map((creditCards ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importações</h1>
        <p className="text-sm text-muted-foreground">
          Envie extratos, faturas, notas fiscais e comprovantes para organizar automaticamente.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <UploadDropzone accounts={accounts ?? []} creditCards={creditCards ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de arquivos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!files?.length ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum arquivo importado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Conta / Cartão</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Transações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="font-medium">{file.file_name}</div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {file.file_type} · {formatSize(file.file_size)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.origin ? IMPORT_ORIGIN_LABELS[file.origin] ?? file.origin : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.credit_card_id
                        ? creditCardNameById.get(file.credit_card_id)
                        : file.account_id
                          ? accountNameById.get(file.account_id)
                          : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(file.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[file.status]}>{IMPORT_STATUS_LABELS[file.status]}</Badge>
                      {file.error_message && (
                        <p className="mt-1 max-w-56 text-xs text-destructive">{file.error_message}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {file.transactions_found > 0 ? file.transactions_found : "—"}
                      {file.errors_found > 0 && (
                        <span className="ml-1 text-destructive">({file.errors_found} erro(s))</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {file.status === "falhou" && (
                          <RetryButton action={retryImportedFile.bind(null, file.id)} />
                        )}
                        <DeleteButton
                          action={deleteImportedFile.bind(null, file.id, file.storage_path)}
                          confirmMessage={`Excluir o arquivo "${file.file_name}"? Isso não afeta transações já confirmadas.`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          CSV, OFX, XLSX e PDFs com texto (extratos e faturas comuns) já são lidos automaticamente ao enviar. PDFs
          escaneados e imagens (comprovantes fotografados) usam OCR por IA — se aparecer &quot;OCR não
          configurado&quot;, é só a chave da API que falta. A tela de revisão das transações extraídas chega no
          Módulo 7.
        </CardContent>
      </Card>
    </div>
  );
}
