import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse } from "@/lib/api";
import { visibleExpenseWhere, dashboardVisibleExpenseWhere } from "@/lib/visibility";
import { decimalToNumber, userCost } from "@/lib/expense-math";
import { PERIODS, resolvePeriod, type Period } from "@/lib/dashboard-period";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Fixed by design (per explicit product decision) rather than user-
// configurable — matched case-insensitively so a small casing change to
// either doesn't silently break the comparison.
const KM_INCOME_TYPE_NAME = "reembolso kms";
const CAR_CATEGORY_NAME = "carro";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const url = new URL(req.url);
  const periodParam = url.searchParams.get("period");
  const period: Period = (PERIODS as readonly string[]).includes(periodParam ?? "")
    ? (periodParam as Period)
    : "6m";

  const now = new Date();
  const { start, end, months, label } = resolvePeriod(now, period);

  const visibility = visibleExpenseWhere(session.user.id);
  const categoryVisibility = dashboardVisibleExpenseWhere();

  const [expenses, incomeEntries, carCategory] = await Promise.all([
    // Personal cost view only (own private expenses + 50% of joint ones) —
    // this chart is scoped to the signed-in user, matching "Spent this
    // month" elsewhere on the dashboard.
    prisma.expense.findMany({
      where: { AND: [visibility, categoryVisibility, { date: { gte: start, lt: end } }] },
      select: {
        value: true,
        reimbursementAmount: true,
        isJoint: true,
        date: true,
        categoryId: true,
      },
    }),
    prisma.incomeEntry.findMany({
      where: { userId: session.user.id, month: { gte: start, lt: end } },
      include: { lines: { include: { sourceType: true } } },
    }),
    prisma.category.findFirst({
      where: { parentId: null, name: { equals: CAR_CATEGORY_NAME, mode: "insensitive" } },
    }),
  ]);

  // Year included (e.g. "Mar 25") — with longer periods (12m, 24m) the
  // same month name recurs across different years, and a month-only label
  // makes it impossible to tell which bar is which.
  const monthDescriptors = months.map((d) => ({
    month: monthKey(d),
    label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  }));
  const idxByMonth = new Map(monthDescriptors.map((m, i) => [m.month, i]));

  const incomeByMonth = Array(months.length).fill(0) as number[];
  const expenseByMonth = Array(months.length).fill(0) as number[];
  const kmIncomeByMonth = Array(months.length).fill(0) as number[];
  const carExpenseByMonth = Array(months.length).fill(0) as number[];

  for (const e of expenses) {
    const idx = idxByMonth.get(monthKey(e.date));
    if (idx === undefined) continue;
    const cost = userCost(
      decimalToNumber(e.value),
      decimalToNumber(e.reimbursementAmount),
      e.isJoint,
    );
    expenseByMonth[idx] += cost;
    if (carCategory && e.categoryId === carCategory.id) carExpenseByMonth[idx] += cost;
  }

  let kmTypeFound = false;
  for (const entry of incomeEntries) {
    const idx = idxByMonth.get(monthKey(entry.month));
    if (idx === undefined) continue;
    for (const line of entry.lines) {
      const gross = decimalToNumber(line.grossAmount);
      const irs = decimalToNumber(line.irsPct);
      const ss = decimalToNumber(line.ssPct);
      const net = gross * (1 - irs - ss);
      incomeByMonth[idx] += net;
      if (line.sourceType.name.trim().toLowerCase() === KM_INCOME_TYPE_NAME) {
        kmTypeFound = true;
        kmIncomeByMonth[idx] += net;
      }
    }
  }

  const chartData = monthDescriptors.map((m, i) => ({
    label: m.label,
    income: Number(incomeByMonth[i].toFixed(2)),
    expense: Number(expenseByMonth[i].toFixed(2)),
  }));

  const comparisonData = monthDescriptors.map((m, i) => ({
    label: m.label,
    incomeAmount: Number(kmIncomeByMonth[i].toFixed(2)),
    expenseAmount: Number(carExpenseByMonth[i].toFixed(2)),
  }));

  const totalIncome = incomeByMonth.reduce((s, v) => s + v, 0);
  const totalExpense = expenseByMonth.reduce((s, v) => s + v, 0);

  return NextResponse.json({
    period,
    label,
    chartData,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    difference: Number((totalIncome - totalExpense).toFixed(2)),
    comparison: {
      incomeTypeName: "Reembolso Kms",
      categoryName: "Carro",
      available: kmTypeFound && !!carCategory,
      data: comparisonData,
    },
  });
}
