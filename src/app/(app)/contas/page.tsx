import { createClient } from "@/lib/supabase/server";
import { setAccountStatus, deleteAccount } from "@/lib/actions/accounts";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { StatusToggleButton } from "@/components/shared/status-toggle-button";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getIcon } from "@/lib/icon-options";
import { ACCOUNT_TYPE_LABELS } from "@/lib/labels";

export default async function ContasPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Contas correntes, digitais, poupança, carteira e investimento.
          </p>
        </div>
        <AccountDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          {!accounts?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhuma conta cadastrada ainda. Clique em &quot;Nova conta&quot; para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const Icon = getIcon(account.icon);
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: `${account.color ?? "#3b82f6"}20`, color: account.color ?? "#3b82f6" }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          {account.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ACCOUNT_TYPE_LABELS[account.type]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {account.institution || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(account.initial_balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.status === "ativa" ? "default" : "secondary"}>
                          {account.status === "ativa" ? "Ativa" : "Arquivada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <AccountDialog account={account} />
                          <StatusToggleButton
                            isActive={account.status === "ativa"}
                            action={setAccountStatus.bind(
                              null,
                              account.id,
                              account.status === "ativa" ? "arquivada" : "ativa",
                            )}
                          />
                          <DeleteButton
                            action={deleteAccount.bind(null, account.id)}
                            confirmMessage={`Excluir a conta "${account.name}"? Transações vinculadas não serão apagadas.`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
