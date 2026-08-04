// Paleta validada (ver skill dataviz): azul/vermelho divergente para receita/despesa,
// azul sequencial para magnitude (gastos por categoria), cinza para "Outros".
export const CHART_COLORS = {
  light: {
    income: "#2a78d6",
    expense: "#e34948",
    sequential: "#2a78d6",
    muted: "#898781",
    grid: "#e1e0d9",
    axis: "#c3c2b7",
  },
  dark: {
    income: "#3987e5",
    expense: "#e66767",
    sequential: "#3987e5",
    muted: "#898781",
    grid: "#2c2c2a",
    axis: "#383835",
  },
};

export function chartColors(resolvedTheme: string | undefined) {
  return resolvedTheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;
}
