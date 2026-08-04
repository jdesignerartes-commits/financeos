export function computeBudgetProjection(used: number, periodYear: number, periodMonth: number, today: Date = new Date()) {
  const daysInMonth = new Date(periodYear, periodMonth, 0).getDate();
  const isCurrentMonth = today.getFullYear() === periodYear && today.getMonth() + 1 === periodMonth;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
  const projected = daysElapsed > 0 ? (used / daysElapsed) * daysInMonth : used;
  return { projected, daysElapsed, daysInMonth };
}

export function budgetAlertLevel(percent: number): "ok" | "warning" | "danger" | "over" {
  if (percent >= 100) return "over";
  if (percent >= 90) return "danger";
  if (percent >= 70) return "warning";
  return "ok";
}
