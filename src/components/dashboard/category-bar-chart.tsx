"use client";

import { useTheme } from "next-themes";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer, Cell } from "recharts";
import { chartColors } from "@/lib/dashboard/colors";
import type { BreakdownEntry } from "@/lib/dashboard/compute";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function CategoryBarChart({ data }: { data: BreakdownEntry[] }) {
  const { resolvedTheme } = useTheme();
  const colors = chartColors(resolvedTheme);

  if (data.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">Sem despesas no período.</p>;
  }

  const height = Math.max(180, data.length * 36 + 32);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke={colors.grid} />
        <XAxis
          type="number"
          tick={{ fill: colors.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: colors.axis }}
          tickFormatter={formatCurrency}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fill: colors.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.id} fill={entry.id === "__other__" ? colors.muted : colors.sequential} />
          ))}
          <LabelList
            dataKey="total"
            position="right"
            formatter={(value: unknown) => formatCurrency(Number(value))}
            style={{ fill: colors.axis, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
