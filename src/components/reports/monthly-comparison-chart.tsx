"use client";

import { useTheme } from "next-themes";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { chartColors } from "@/lib/dashboard/colors";
import type { MonthlyPoint } from "@/lib/reports-compute";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function MonthlyComparisonChart({ data }: { data: MonthlyPoint[] }) {
  const { resolvedTheme } = useTheme();
  const colors = chartColors(resolvedTheme);

  if (data.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">Sem dados no período selecionado.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fill: colors.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: colors.axis }}
        />
        <YAxis
          tick={{ fill: colors.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={formatCurrency}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          labelFormatter={(month) => formatMonth(String(month))}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receita" name="Receitas" fill={colors.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="despesa" name="Despesas" fill={colors.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
