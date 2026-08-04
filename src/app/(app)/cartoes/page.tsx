import { createClient } from "@/lib/supabase/server";
import { setCreditCardStatus, deleteCreditCard } from "@/lib/actions/credit-cards";
import { CreditCardDialog } from "@/components/credit-cards/credit-card-dialog";
import { StatusToggleButton } from "@/components/shared/status-toggle-button";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard as CreditCardIcon } from "lucide-react";
import { CARD_BRAND_LABELS } from "@/lib/labels";

export default async function CartoesPage() {
  const supabase = await createClient();
  const [{ data: cards }, { data: accounts }] = await Promise.all([
    supabase
      .from("credit_cards")
      .select("*")
      .order("status", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("accounts").select("id, name, status").order("name"),
  ]);

  const activeAccounts = (accounts ?? []).filter((account) => account.status === "ativa");
  const accountNameById = new Map((accounts ?? []).map((account) => [account.id, account.name]));

  const formatCurrency = (value: number | null) =>
    value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cartões</h1>
          <p className="text-sm text-muted-foreground">
            Cartões de crédito, com limite, fechamento e vencimento.
          </p>
        </div>
        <CreditCardDialog accounts={activeAccounts} />
      </div>

      <Card>
        <CardContent className="p-0">
          {!cards?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum cartão cadastrado ainda. Clique em &quot;Novo cartão&quot; para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cartão</TableHead>
                  <TableHead>Bandeira</TableHead>
                  <TableHead>Fechamento / Vencimento</TableHead>
                  <TableHead className="text-right">Limite</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${card.color ?? "#8b5cf6"}20`, color: card.color ?? "#8b5cf6" }}
                        >
                          <CreditCardIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <div>{card.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {card.bank} {card.last_digits ? `•••• ${card.last_digits}` : ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {card.brand ? CARD_BRAND_LABELS[card.brand] ?? card.brand : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {card.closing_day ? `Dia ${card.closing_day}` : "—"} /{" "}
                      {card.due_day ? `Dia ${card.due_day}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(card.credit_limit)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {card.account_id ? accountNameById.get(card.account_id) ?? "—" : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={card.status === "ativo" ? "default" : "secondary"}>
                        {card.status === "ativo" ? "Ativo" : "Arquivado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <CreditCardDialog card={card} accounts={activeAccounts} />
                        <StatusToggleButton
                          isActive={card.status === "ativo"}
                          action={setCreditCardStatus.bind(
                            null,
                            card.id,
                            card.status === "ativo" ? "arquivado" : "ativo",
                          )}
                        />
                        <DeleteButton
                          action={deleteCreditCard.bind(null, card.id)}
                          confirmMessage={`Excluir o cartão "${card.name}"? Transações vinculadas não serão apagadas.`}
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
    </div>
  );
}
