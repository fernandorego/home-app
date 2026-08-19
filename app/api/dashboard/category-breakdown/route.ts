import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse } from "@/lib/api";
import { visibleExpenseWhere } from "@/lib/visibility";
import { decimalToNumber, userCost } from "@/lib/expense-math";
import { PERIODS, resolvePeriod, type Period } from "@/lib/dashboard-period";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period");
  const period: Period = (PERIODS as readonly string[]).includes(periodParam ?? "")
    ? (periodParam as Period)
    : "month";
  const mode = searchParams.get("mode") === "evolution" ? "evolution" : "totals";
  const categoryId = searchParams.get("categoryId") || undefined;
  const subcategoryId = searchParams.get("subcategoryId") || undefined;

  const now = new Date();
  const { start, end, months, label } = resolvePeriod(now, period);
  const visibility = visibleExpenseWhere(session.user.id);

  const [rows, categories] = await Promise.all([
    prisma.expense.findMany({
      where: {
        AND: [
          visibility,
          { date: { gte: start, lt: end } },
          categoryId ? { categoryId } : {},
          subcategoryId ? { subcategoryId } : {},
        ],
      },
      select: {
        value: true,
        reimbursementAmount: true,
        isJoint: true,
        date: true,
        categoryId: true,
        subcategoryId: true,
      },
    }),
    prisma.category.findMany({ select: { id: true, name: true, parentId: true } }),
  ]);

  const catById = new Map(categories.map((c) => [c.id, c]));

  let scopeLabel = "All categories";
  if (categoryId) {
    scopeLabel = catById.get(categoryId)?.name ?? "Category";
    if (subcategoryId) {
      scopeLabel += ` › ${catById.get(subcategoryId)?.name ?? "Subcategory"}`;
    }
  }

  type Bar = { key: string; label: string; value: number };
  let bars: Bar[];

  if (mode === "evolution") {
    const byMonth = new Map(months.map((d) => [monthKey(d), 0]));
    for (const r of rows) {
      const k = monthKey(r.date);
      if (!byMonth.has(k)) continue;
      const cost = userCost(
        decimalToNumber(r.value),
        decimalToNumber(r.reimbursementAmount),
        r.isJoint,
      );
      byMonth.set(k, (byMonth.get(k) ?? 0) + cost);
    }
    bars = months.map((d) => {
      const k = monthKey(d);
      return {
        key: k,
        label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        value: Number((byMonth.get(k) ?? 0).toFixed(2)),
      };
    });
  } else {
    // Group by subcategory when a category is selected (and no subcategory
    // chosen yet); otherwise group by top-level category. A fully-specified
    // category + subcategory scope collapses to a single bar.
    const groupKey = (r: (typeof rows)[number]) => {
      if (categoryId && subcategoryId) return subcategoryId;
      if (categoryId) return r.subcategoryId ?? "__none__";
      return r.categoryId;
    };
    const totals = new Map<string, number>();
    for (const r of rows) {
      const key = groupKey(r);
      const cost = userCost(
        decimalToNumber(r.value),
        decimalToNumber(r.reimbursementAmount),
        r.isJoint,
      );
      totals.set(key, (totals.get(key) ?? 0) + cost);
    }
    bars = [...totals.entries()]
      .map(([key, value]) => {
        let name: string;
        if (categoryId && subcategoryId) {
          name = scopeLabel;
        } else if (categoryId) {
          name = key === "__none__" ? "(no subcategory)" : (catById.get(key)?.name ?? "Unknown");
        } else {
          name = catById.get(key)?.name ?? "Unknown";
        }
        return { key, label: name, value: Number(value.toFixed(2)) };
      })
      .filter((b) => b.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  return NextResponse.json({ period, mode, label, scopeLabel, bars });
}
