import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  isErrorResponse,
  badRequest,
  handleZod,
} from "@/lib/api";
import { expenseInputSchema, expenseFilterSchema } from "@/lib/validators";
import { visibleExpenseWhere } from "@/lib/visibility";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());

  let filter;
  try {
    filter = expenseFilterSchema.parse(params);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }

  // Case- and accent-insensitive search (e.g. "saude" matches "Saúde"):
  // Prisma's `contains` can't call the unaccent() SQL function, so resolve
  // matching ids via a raw query first, then intersect with the other
  // filters (including visibility) in the main query below.
  let searchMatchIds: string[] | null = null;
  if (filter.q) {
    const pattern = `%${filter.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Expense"
      WHERE unaccent(lower(description)) LIKE unaccent(lower(${pattern}))
         OR (comment IS NOT NULL AND unaccent(lower(comment)) LIKE unaccent(lower(${pattern})))
    `;
    searchMatchIds = rows.map((r) => r.id);
  }

  // Subcategory multi-select can mix real ids with the "__none__" sentinel
  // (expenses with no subcategory at all), which needs its own OR branch.
  const subIds = filter.subcategoryId?.filter((id) => id !== "__none__") ?? [];
  const wantsNoSubcategory = filter.subcategoryId?.includes("__none__") ?? false;
  const subcategoryFilter: Prisma.ExpenseWhereInput = !filter.subcategoryId?.length
    ? {}
    : wantsNoSubcategory && subIds.length
      ? { OR: [{ subcategoryId: null }, { subcategoryId: { in: subIds } }] }
      : wantsNoSubcategory
        ? { subcategoryId: null }
        : { subcategoryId: { in: subIds } };

  // "Reimburse" isn't a single column, so each selected status becomes its
  // own condition and they're OR'd together.
  const reimburseConditions: Prisma.ExpenseWhereInput[] = (filter.reimburse ?? []).map(
    (r) =>
      r === "awaiting"
        ? { reimbursementAmount: { not: null }, reimbursedAt: null }
        : r === "received"
          ? { reimbursedAt: { not: null } }
          : { reimbursementAmount: null },
  );

  // Booleans have no `in` filter — selecting both (or neither) means "any",
  // and only a single selected value actually narrows the results.
  const isJointValues = [...new Set(filter.isJoint ?? [])].map((v) => v === "true");

  const where: Prisma.ExpenseWhereInput = {
    AND: [
      visibleExpenseWhere(session.user.id),
      filter.categoryId?.length ? { categoryId: { in: filter.categoryId } } : {},
      subcategoryFilter,
      filter.userId ? { userId: filter.userId } : {},
      isJointValues.length === 1 ? { isJoint: isJointValues[0] } : {},
      filter.coverflexStatus?.length
        ? { coverflexStatus: { in: filter.coverflexStatus } }
        : {},
      filter.from ? { date: { gte: filter.from } } : {},
      filter.to ? { date: { lte: filter.to } } : {},
      reimburseConditions.length ? { OR: reimburseConditions } : {},
      searchMatchIds ? { id: { in: searchMatchIds } } : {},
    ],
  };

  const orderBy: Prisma.ExpenseOrderByWithRelationInput =
    filter.sort === "category"
      ? { category: { name: filter.order } }
      : filter.sort === "reimbursementAmount"
        ? { reimbursementAmount: { sort: filter.order, nulls: "last" } }
        : { [filter.sort]: filter.order };

  const skip = (filter.page - 1) * filter.pageSize;

  const [expenses, total] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      orderBy,
      skip,
      take: filter.pageSize,
      include: {
        category: true,
        subcategory: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return NextResponse.json({ data: expenses, total });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = expenseInputSchema.parse(body);

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) return badRequest("Category does not exist");
    if (category.parentId)
      return badRequest("Pick a top-level category, not a subcategory");

    if (data.subcategoryId) {
      const sub = await prisma.category.findUnique({
        where: { id: data.subcategoryId },
      });
      if (!sub) return badRequest("Subcategory does not exist");
      if (sub.parentId !== data.categoryId) {
        return badRequest(
          "Subcategory does not belong to the selected category",
        );
      }
    }

    const created = await prisma.expense.create({
      data: {
        value: new Prisma.Decimal(data.value),
        description: data.description,
        comment: data.comment ?? null,
        date: data.date,
        isJoint: data.isJoint,
        coverflexStatus: data.coverflexStatus,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId ?? null,
        reimbursementAmount:
          data.reimbursementAmount != null
            ? new Prisma.Decimal(data.reimbursementAmount)
            : null,
        reimburser: data.reimburser ?? null,
        reimbursedAt: data.reimbursedAt ?? null,
        userId: session.user.id,
      },
      include: {
        category: true,
        subcategory: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}
