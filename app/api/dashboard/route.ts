import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse } from "@/lib/api";
import { visibleExpenseWhere } from "@/lib/visibility";

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

function decimalToNumber(v: Prisma.Decimal | string | number | null | undefined) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
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
  const yearStart = startOfYear(now);

  // Pull a window wide enough for every aggregation we need.
  const fetchStart = new Date(
    Math.min(
      lineWindowStart.getTime(),
      pie.start.getTime(),
      lastMonthStart.getTime(),
      yearStart.getTime(),
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
  let monthRefundExpected = 0;
  let lastMonthTotal = 0;
  let jointThisMonth = 0;
  let privateThisMonth = 0;
  let reimbursedYTD = 0;
  let largestExpense: {
    id: string;
    description: string;
    value: number;
    date: Date;
    categoryName: string;
  } | null = null;

  // ---- Cumulative daily totals for this month and last month ----
  const thisMonthDailyTotals = new Map<number, number>(); // day -> total
  const lastMonthDailyTotals = new Map<number, number>();

  // ---- Pie data for selected range ----
  const pieByCategory = new Map<string, { name: string; total: number }>();

  // ---- Reimburser leaderboard (received reimbursements YTD) ----
  const reimburserMap = new Map<string, { name: string; total: number; count: number }>();

  for (const e of recentExpenses) {
    const v = decimalToNumber(e.value);
    const k = monthKey(e.date);
    const idx = idxByMonth.get(k);
    const topId = e.category.parentId ?? e.categoryId;
    const topName = topCatById.get(topId)?.name ?? e.category.name;

    if (idx !== undefined) {
      const arr = monthlyByCategory.get(topId);
      if (arr) arr[idx] += v;
    }

    if (e.date >= monthStart) {
      monthTotal += v;
      monthRefundExpected += decimalToNumber(e.reimbursementAmount);
      if (e.isJoint) jointThisMonth += v;
      else privateThisMonth += v;
      const day = e.date.getDate();
      thisMonthDailyTotals.set(day, (thisMonthDailyTotals.get(day) ?? 0) + v);
      if (!largestExpense || v > largestExpense.value) {
        largestExpense = {
          id: e.id,
          description: e.description,
          value: v,
          date: e.date,
          categoryName: topName,
        };
      }
    } else if (e.date >= lastMonthStart && e.date < monthStart) {
      lastMonthTotal += v;
      const day = e.date.getDate();
      lastMonthDailyTotals.set(day, (lastMonthDailyTotals.get(day) ?? 0) + v);
    }

    // Pie totals within selected range
    if (e.date >= pie.start && e.date < pie.end) {
      const cur = pieByCategory.get(topId) ?? { name: topName, total: 0 };
      cur.total += v;
      pieByCategory.set(topId, cur);
    }

    // Reimbursements received year-to-date
    if (e.reimbursedAt && e.reimbursedAt >= yearStart) {
      const amount = decimalToNumber(e.reimbursementAmount);
      reimbursedYTD += amount;
      const who = e.reimburser?.trim() || "Unspecified";
      const cur = reimburserMap.get(who) ?? { name: who, total: 0, count: 0 };
      cur.total += amount;
      cur.count += 1;
      reimburserMap.set(who, cur);
    }
  }

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

  // ---- Over-budget (this month) ----
  const overBudgetThisMonth: Array<{
    id: string;
    name: string;
    budget: number;
    spent: number;
    overshoot: number;
  }> = [];
  for (const x of totalsByCategory) {
    const budget =
      x.c.monthlyBudget != null ? decimalToNumber(x.c.monthlyBudget) : null;
    if (budget != null && x.currentMonthValue > budget) {
      overBudgetThisMonth.push({
        id: x.c.id,
        name: x.c.name,
        budget,
        spent: x.currentMonthValue,
        overshoot: x.currentMonthValue - budget,
      });
    }
  }

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
    orderBy: { date: "desc" },
    select: {
      id: true,
      description: true,
      date: true,
      value: true,
      reimbursementAmount: true,
      reimburser: true,
    },
  });
  const awaitingTotal = awaitingRows.reduce(
    (s, r) => s + decimalToNumber(r.reimbursementAmount),
    0,
  );
  const awaitingDetails = awaitingRows.map((r) => ({
    id: r.id,
    description: r.description,
    date: r.date.toISOString(),
    value: decimalToNumber(r.value),
    amount: decimalToNumber(r.reimbursementAmount),
    reimburser: r.reimburser,
  }));

  // ---- Reimburser leaderboard ----
  const reimburserLeaderboard = [...reimburserMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ---- Tasks + Shopping ----
  const tasksRaw = await prisma.task.findMany({
    where: { completed: false },
    include: { assignee: { select: { id: true, name: true, email: true } } },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    take: 6,
  });
  const shoppingRaw = await prisma.shoppingItem.findMany({
    where: { bought: false },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 6,
  });

  return NextResponse.json({
    monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    expenses: {
      monthTotal,
      monthRefundExpected,
      monthNet: monthTotal - monthRefundExpected,
      lastMonthTotal,
      dailyAverage: todayDay > 0 ? monthTotal / todayDay : 0,
      daysInMonthSoFar: todayDay,
      daysInCurrentMonth: dimThis,
      projectedMonthTotal: todayDay > 0 ? (monthTotal / todayDay) * dimThis : 0,
      jointThisMonth,
      privateThisMonth,
      largestExpense: largestExpense
        ? {
            id: largestExpense.id,
            description: largestExpense.description,
            value: largestExpense.value,
            date: largestExpense.date.toISOString(),
            categoryName: largestExpense.categoryName,
          }
        : null,
      reimbursedYTD,
      awaitingTotal,
      awaitingCount: awaitingRows.length,
      awaitingDetails,
      chartData,
      chartCategories: chartCategories.map(({ series, ...c }) => {
        void series;
        return c;
      }),
      overBudgetThisMonth,
      topCategories: topPieCategories,
      pieRangeLabel: pie.label,
      pieRangeTotal: pieTotal,
      cumulative: {
        data: cumulativeData,
        thisMonthTotal: monthTotal,
        lastMonthAtSameDay,
        lastMonthTotal,
      },
      reimburserLeaderboard,
    },
    tasks: tasksRaw,
    shopping: shoppingRaw,
  });
}
