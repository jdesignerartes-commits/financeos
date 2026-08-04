import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { computeInstallmentProgress } from "@/lib/installments-compute";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type DayEvent = { label: string; kind: "receita" | "despesa" | "parcela" | "assinatura" | "cartao" };

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const month = firstValue(params.month) || new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);

  const startDate = `${month}-01`;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const endDate = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

  const supabase = await createClient();

  const [
    { data: transactions },
    { data: installments },
    { data: subscriptions },
    { data: creditCards },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("date, amount, type, friendly_description")
      .gte("date", startDate)
      .lte("date", endDate),
    supabase.from("installments").select("description, start_date, total_installments"),
    supabase.from("subscriptions").select("name, next_expected_date, status").eq("status", "ativa"),
    supabase.from("credit_cards").select("name, closing_day, due_day").eq("status", "ativo"),
  ]);

  const eventsByDay = new Map<number, DayEvent[]>();
  function addEvent(day: number, event: DayEvent) {
    if (day < 1 || day > daysInMonth) return;
    const list = eventsByDay.get(day) ?? [];
    list.push(event);
    eventsByDay.set(day, list);
  }

  const totalsByDay = new Map<number, { receita: number; despesa: number }>();
  for (const t of transactions ?? []) {
    const day = Number(t.date.slice(8, 10));
    const entry = totalsByDay.get(day) ?? { receita: 0, despesa: 0 };
    if (t.type === "receita") entry.receita += t.amount;
    else if (t.type === "despesa") entry.despesa += t.amount;
    totalsByDay.set(day, entry);
  }

  for (const installment of installments ?? []) {
    const progress = computeInstallmentProgress(installment.start_date, installment.total_installments, new Date(year, monthNumber - 1, 1));
    if (progress.finished) continue;
    const day = Number(installment.start_date.slice(8, 10));
    addEvent(Math.min(day, daysInMonth), { label: `Parcela: ${installment.description}`, kind: "parcela" });
  }

  for (const sub of subscriptions ?? []) {
    if (!sub.next_expected_date) continue;
    const [subYear, subMonth, subDay] = sub.next_expected_date.split("-").map(Number);
    if (subYear === year && subMonth === monthNumber) {
      addEvent(subDay, { label: `Assinatura: ${sub.name}`, kind: "assinatura" });
    }
  }

  for (const card of creditCards ?? []) {
    if (card.closing_day) addEvent(card.closing_day, { label: `Fecha: ${card.name}`, kind: "cartao" });
    if (card.due_day) addEvent(card.due_day, { label: `Vence: ${card.name}`, kind: "cartao" });
  }

  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    const date = new Date(year, monthNumber - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const today = new Date();
  const isCurrentMonthView = today.getFullYear() === year && today.getMonth() + 1 === monthNumber;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            Compras, receitas, parcelas, assinaturas e vencimentos de cartão do mês.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={`/calendario?month=${shiftMonth(-1)}`} aria-label="Mês anterior" />}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium capitalize">{monthLabel}</span>
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={`/calendario?month=${shiftMonth(1)}`} aria-label="Próximo mês" />}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-2 md:p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day == null) return <div key={`empty-${index}`} className="min-h-24 rounded-md bg-muted/20" />;

              const totals = totalsByDay.get(day);
              const events = eventsByDay.get(day) ?? [];
              const isToday = isCurrentMonthView && today.getDate() === day;

              return (
                <div
                  key={day}
                  className={`min-h-24 rounded-md border p-1.5 text-left ${isToday ? "border-primary" : "border-transparent bg-muted/20"}`}
                >
                  <div className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</div>
                  <div className="mt-1 space-y-0.5">
                    {totals && totals.receita > 0 && (
                      <div className="truncate text-[11px] text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(totals.receita)}
                      </div>
                    )}
                    {totals && totals.despesa > 0 && (
                      <div className="truncate text-[11px] text-destructive">-{formatCurrency(totals.despesa)}</div>
                    )}
                    {events.slice(0, 2).map((event, i) => (
                      <div key={i} className="truncate text-[10px] text-muted-foreground">
                        {event.label}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{events.length - 2} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
