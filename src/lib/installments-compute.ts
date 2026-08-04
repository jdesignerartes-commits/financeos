export function computeInstallmentProgress(startDate: string, totalInstallments: number, today: Date = new Date()) {
  const start = new Date(`${startDate}T00:00:00`);
  const monthsElapsed =
    (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()) + 1;

  const finished = monthsElapsed > totalInstallments;
  const current = Math.min(Math.max(monthsElapsed, 1), totalInstallments);
  const remaining = Math.max(totalInstallments - current, 0);
  const endDate = new Date(start.getFullYear(), start.getMonth() + totalInstallments - 1, start.getDate());

  return { current, remaining, endDate, finished };
}
