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
  const barKey = searchParams.get("barKey") || undefined;

  const now = new Date();
  const { start, end, months } = resolvePeriod(now, period);
  const visibility = visibleExpenseWhere(session.user.id);

  // Resolve the actual date window and category scope the clicked bar
  // represents: in evolution mode the bar is a month, in totals mode it's
  // either a top-level category, a subcategory, or (if both filters are
  // already set) the same single scope as the aggregate bar.
  let dateStart = start;
  let dateEnd = end;
  let effectiveCategoryId = categoryId;
  let effectiveSubcategoryId = subcategoryId;

  if (mode === "evolution") {
    const bucket = months.find((d) => monthKey(d) === barKey);
    if (bucket) {
      dateStart = bucket;
      dateEnd = new Date(bucket.getFullYear(), bucket.getMonth() + 1, 1);
    }
  } else if (barKey) {
    if (categoryId && subcategoryId) {
      // Fully specified already; nothing more to resolve from barKey.
    } else if (categoryId) {
      effectiveSubcategoryId = barKey === "__none__" ? "__none__" : barKey;
    } else {
      effectiveCategoryId = barKey;
    }
  }

  const rows = await prisma.expense.findMany({
    where: {
      AND: [
        visibility,
        { date: { gte: dateStart, lt: dateEnd } },
        effectiveCategoryId ? { categoryId: effectiveCategoryId } : {},
        effectiveSubcategoryId
          ? effectiveSubcategoryId === "__none__"
            ? { subcategoryId: null }
            : { subcategoryId: effectiveSubcategoryId }
          : {},
      ],
    },
    select: {
      id: true,
      description: true,
      date: true,
      value: true,
      reimbursementAmount: true,
      isJoint: true,
      category: { select: { name: true, parentId: true } },
      categoryId: true,
    },
  });

  const topCategories = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true },
  });
  const topById = new Map(topCategories.map((c) => [c.id, c.name]));

  const details = rows
    .map((r) => {
      const topId = r.category.parentId ?? r.categoryId;
      return {
        id: r.id,
        description: r.description,
        date: r.date.toISOString(),
        value: userCost(
          decimalToNumber(r.value),
          decimalToNumber(r.reimbursementAmount),
          r.isJoint,
        ),
        categoryName: topById.get(topId) ?? r.category.name,
      };
    })
    .sort((a, b) => b.value - a.value);

  return NextResponse.json({ details });
}
