import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse } from "@/lib/api";
import { visibleExpenseWhere } from "@/lib/visibility";
import { decimalToNumber, userCost } from "@/lib/expense-math";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 0, 0, 0, 0);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

type PieRange = "month" | "lastMonth" | "3m" | "ytd";
function pieRangeFromParam(v: string | null): PieRange {
  if (v === "lastMonth" || v === "3m" || v === "ytd") return v;
  return "month";
}
function pieRangeWindow(now: Date, range: PieRange): {
  start: Date;
  end: Date;
  label: string;
} {
  const ms = startOfMonth(now);
  if (range === "lastMonth") {
    const start = addMonths(ms, -1);
    return {
      start,
      end: ms,
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }
  if (range === "3m") {
    return {
      start: addMonths(ms, -2),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      label: "Last 3 months",
    };
  }
  if (range === "ytd") {
    return {
      start: startOfYear(now),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      label: `${now.getFullYear()} year to date`,
    };
  }
  return {
    start: ms,
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    label: ms.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}

const TOP_N = 5;

export async function GET(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const url = new URL(req.url);
  const lineMonths = clamp(Number(url.searchParams.get("lineMonths")) || 6, 3, 24);
  const pieRange = pieRangeFromParam(url.searchParams.get("pieRange"));

  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = addMonths(monthStart, -1);
  const lineWindowStart = addMonths(monthStart, -(lineMonths - 1));
  const pie = pieRangeWindow(now, pieRange);

  // Pull a window wide enough for every aggregation we need.
  const fetchStart = new Date(
    Math.min(
      lineWindowStart.getTime(),
      pie.start.getTime(),
      lastMonthStart.getTime(),
    ),
  );

  const visibility = visibleExpenseWhere(session.user.id);

  const [recentExpenses, topCategoriesRows] = await Promise.all([
    prisma.expense.findMany({
      where: { AND: [visibility, { date: { gte: fetchStart } }] },
      include: { category: { select: { id: true, name: true, parentId: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, monthlyBudget: true },
    }),
  ]);

  // ---- Monthly buckets for the line chart ----
  const monthDescriptors: Array<{ month: string; label: string }> = [];
  for (let i = lineMonths - 1; i >= 0; i--) {
    const d = addMonths(monthStart, -i);
    monthDescriptors.push({
      month: monthKey(d),
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  const idxByMonth = new Map(monthDescriptors.map((m, i) => [m.month, i]));

  const topCatById = new Map(topCategoriesRows.map((c) => [c.id, c]));
  const monthlyByCategory = new Map<string, number[]>();
  for (const c of topCategoriesRows) {
    monthlyByCategory.set(c.id, Array(lineMonths).fill(0));
  }

  // ---- Running aggregates ----
  let monthTotal = 0;
  let lastMonthTotal = 0;

  // ---- Cumulative daily totals for this month and last month ----
  const thisMonthDailyTotals = new Map<number, number>(); // day -> total
  const lastMonthDailyTotals = new Map<number, number>();

  // ---- Pie data for selected range ----
  const pieByCategory = new Map<string, { name: string; total: number }>();

  // ---- This month's expenses, for the "Spent this month" detail popup ----
  const monthExpenseDetails: Array<{
    id: string;
    description: string;
    date: string;
    value: number;
    categoryName: string;
  }> = [];

  for (const e of recentExpenses) {
    const cost = userCost(
      decimalToNumber(e.value),
      decimalToNumber(e.reimbursementAmount),
      e.isJoint,
    );
    const k = monthKey(e.date);
    const idx = idxByMonth.get(k);
    const topId = e.category.parentId ?? e.categoryId;
    const topName = topCatById.get(topId)?.name ?? e.category.name;

    if (idx !== undefined) {
      const arr = monthlyByCategory.get(topId);
      if (arr) arr[idx] += cost;
    }

    if (e.date >= monthStart) {
      monthTotal += cost;
      const day = e.date.getDate();
      thisMonthDailyTotals.set(day, (thisMonthDailyTotals.get(day) ?? 0) + cost);
      monthExpenseDetails.push({
        id: e.id,
        description: e.description,
        date: e.date.toISOString(),
        value: cost,
        categoryName: topName,
      });
    } else if (e.date >= lastMonthStart && e.date < monthStart) {
      lastMonthTotal += cost;
      const day = e.date.getDate();
      lastMonthDailyTotals.set(day, (lastMonthDailyTotals.get(day) ?? 0) + cost);
    }

    // Pie totals within selected range
    if (e.date >= pie.start && e.date < pie.end) {
      const cur = pieByCategory.get(topId) ?? { name: topName, total: 0 };
      cur.total += cost;
      pieByCategory.set(topId, cur);
    }
  }

  monthExpenseDetails.sort((a, b) => b.value - a.value);

  // ---- Build line chart data ----
  const totalsByCategory = [...topCategoriesRows]
    .map((c) => {
      const series = monthlyByCategory.get(c.id) ?? Array(lineMonths).fill(0);
      const total = series.reduce((s, v) => s + v, 0);
      const currentMonthValue = series[series.length - 1] ?? 0;
      return { c, series, total, currentMonthValue };
    })
    .filter((x) => x.total > 0 || x.c.monthlyBudget != null)
    .sort((a, b) => b.total - a.total);

  const chartCategories = totalsByCategory.slice(0, TOP_N).map((x) => {
    const budget = x.c.monthlyBudget != null ? decimalToNumber(x.c.monthlyBudget) : null;
    return {
      id: x.c.id,
      name: x.c.name,
      monthlyBudget: budget,
      currentMonthValue: x.currentMonthValue,
      overBudget: budget != null && x.currentMonthValue > budget,
      series: x.series,
    };
  });

  const chartData = monthDescriptors.map((m, i) => {
    const point: Record<string, string | number> = { label: m.label };
    for (const c of chartCategories) {
      point[c.id] = Number(c.series[i].toFixed(2));
    }
    return point;
  });

  // ---- Pie (selected range) ----
  const sortedPie = [...pieByCategory.values()].sort((a, b) => b.total - a.total);
  const topPieCategories = sortedPie.slice(0, TOP_N);
  const otherPieTotal = sortedPie.slice(TOP_N).reduce((s, c) => s + c.total, 0);
  if (otherPieTotal > 0) topPieCategories.push({ name: "Other", total: otherPieTotal });
  const pieTotal = sortedPie.reduce((s, c) => s + c.total, 0);

  // ---- Cumulative daily series (current month vs last month) ----
  const todayDay = now.getDate();
  const dimThis = daysInMonth(now);
  const dimLast = daysInMonth(lastMonthStart);
  const maxDays = Math.max(dimThis, dimLast);
  const cumulativeData: Array<{
    day: number;
    thisMonth: number | null;
    lastMonth: number | null;
  }> = [];
  let cumThis = 0;
  let cumLast = 0;
  let lastMonthAtSameDay = 0;
  for (let day = 1; day <= maxDays; day++) {
    if (day <= dimLast) cumLast += lastMonthDailyTotals.get(day) ?? 0;
    if (day <= dimThis && day <= todayDay) cumThis += thisMonthDailyTotals.get(day) ?? 0;
    if (day === todayDay) lastMonthAtSameDay = cumLast;
    cumulativeData.push({
      day,
      thisMonth: day <= todayDay && day <= dimThis ? Number(cumThis.toFixed(2)) : null,
      lastMonth: day <= dimLast ? Number(cumLast.toFixed(2)) : null,
    });
  }

  // ---- Awaiting reimbursement (all time) ----
  const awaitingRows = await prisma.expense.findMany({
    where: {
      AND: [
        visibility,
        { reimbursementAmount: { not: null } },
        { reimbursedAt: null },
      ],
    },
    orderBy: { reimbursementAmount: "desc" },
    select: {
      id: true,
      description: true,
      date: true,
      value: true,
      reimbursementAmount: true,
      reimburser: true,
      category: { select: { name: true, parentId: true } },
      categoryId: true,
    },
  });
  const awaitingTotal = awaitingRows.reduce(
    (s, r) => s + decimalToNumber(r.reimbursementAmount),
    0,
  );
  const awaitingDetails = awaitingRows.map((r) => {
    const topId = r.category.parentId ?? r.categoryId;
    return {
      id: r.id,
      description: r.description,
      date: r.date.toISOString(),
      value: decimalToNumber(r.value),
      amount: decimalToNumber(r.reimbursementAmount),
      reimburser: r.reimburser,
      categoryName: topCatById.get(topId)?.name ?? r.category.name,
    };
  });

  // ---- Awaiting Coverflex (all time) ----
  const awaitingCoverflexRows = await prisma.expense.findMany({
    where: {
      AND: [visibility, { coverflexStatus: "WAITING" }],
    },
    orderBy: { value: "desc" },
    select: {
      id: true,
      description: true,
      date: true,
      value: true,
      coverflexStatus: true,
      category: { select: { name: true, parentId: true } },
      categoryId: true,
    },
  });
  const awaitingCoverflexTotal = awaitingCoverflexRows.reduce(
    (s, r) => s + decimalToNumber(r.value),
    0,
  );
  const awaitingCoverflexDetails = awaitingCoverflexRows.map((r) => {
    const topId = r.category.parentId ?? r.categoryId;
    return {
      id: r.id,
      description: r.description,
      date: r.date.toISOString(),
      value: decimalToNumber(r.value),
      coverflexStatus: r.coverflexStatus,
      categoryName: topCatById.get(topId)?.name ?? r.category.name,
    };
  });

  return NextResponse.json({
    monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    expenses: {
      monthTotal,
      lastMonthTotal,
      monthExpenseDetails,
      awaitingTotal,
      awaitingCount: awaitingRows.length,
      awaitingDetails,
      awaitingCoverflexTotal,
      awaitingCoverflexCount: awaitingCoverflexRows.length,
      awaitingCoverflexDetails,
      chartData,
      chartCategories: chartCategories.map(({ series, ...c }) => {
        void series;
        return c;
      }),
      topCategories: topPieCategories,
      pieRangeLabel: pie.label,
      pieRangeTotal: pieTotal,
      cumulative: {
        data: cumulativeData,
        thisMonthTotal: monthTotal,
        lastMonthAtSameDay,
        lastMonthTotal,
      },
    },
  });
}
