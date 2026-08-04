"use client";

import { useTheme } from "next-themes";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { chartColors } from "@/lib/dashboard/colors";
import type { DailyPoint } from "@/lib/dashboard/compute";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function EvolutionChart({ data }: { data: DailyPoint[] }) {
  const { resolvedTheme } = useTheme();
  const colors = chartColors(resolvedTheme);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="day"
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
          labelFormatter={(day) => `Dia ${day}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="receita" name="Receitas" stroke={colors.income} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="despesa" name="Despesas" stroke={colors.expense} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
