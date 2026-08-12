// Paleta validada (ver skill dataviz): divergente para receita/despesa,
// sequencial para magnitude (gastos por categoria), cinza para "Outros".
// Ajustada ao tema minimalista: verde profundo para receita, terracota para despesa.
export const CHART_COLORS = {
  light: {
    income: "#2c4b38",
    expense: "#9b6a52",
    sequential: "#2c4b38",
    muted: "#c9cdc2",
    grid: "#e5e5dd",
    axis: "#8d918a",
  },
  dark: {
    income: "#6f9a7f",
    expense: "#c08e74",
    sequential: "#6f9a7f",
    muted: "#5c605a",
    grid: "#2c2c2a",
    axis: "#8d918a",
  },
};

export function chartColors(resolvedTheme: string | undefined) {
  return resolvedTheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;
}
