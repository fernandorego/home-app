export const PERIODS = ["month", "lastMonth", "3m", "6m", "12m", "ytd"] as const;
export type Period = (typeof PERIODS)[number];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 0, 0, 0, 0);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

export function resolvePeriod(
  now: Date,
  period: Period,
): { start: Date; end: Date; months: Date[]; label: string } {
  const monthStart = startOfMonth(now);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (period === "lastMonth") {
    const start = addMonths(monthStart, -1);
    return {
      start,
      end: monthStart,
      months: [start],
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }

  if (period === "3m" || period === "6m" || period === "12m") {
    const n = period === "3m" ? 3 : period === "6m" ? 6 : 12;
    const start = addMonths(monthStart, -(n - 1));
    const months = Array.from({ length: n }, (_, i) => addMonths(start, i));
    return { start, end, months, label: `Last ${n} months` };
  }

  if (period === "ytd") {
    const start = startOfYear(now);
    const months: Date[] = [];
    for (let d = start; d <= monthStart; d = addMonths(d, 1)) months.push(d);
    return { start, end, months, label: `${now.getFullYear()} year to date` };
  }

  return {
    start: monthStart,
    end,
    months: [monthStart],
    label: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}
