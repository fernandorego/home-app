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

  const where: Prisma.ExpenseWhereInput = {
    AND: [
      visibleExpenseWhere(session.user.id),
      filter.categoryId ? { categoryId: filter.categoryId } : {},
      filter.subcategoryId ? { subcategoryId: filter.subcategoryId } : {},
      filter.userId ? { userId: filter.userId } : {},
      filter.isJoint !== undefined ? { isJoint: filter.isJoint } : {},
      filter.from ? { date: { gte: filter.from } } : {},
      filter.to ? { date: { lte: filter.to } } : {},
      filter.reimburse === "awaiting"
        ? { reimbursementAmount: { not: null }, reimbursedAt: null }
        : filter.reimburse === "received"
          ? { reimbursedAt: { not: null } }
          : filter.reimburse === "none"
            ? { reimbursementAmount: null }
            : {},
      filter.q
        ? {
            OR: [
              { description: { contains: filter.q } },
              { comment: { contains: filter.q } },
            ],
          }
        : {},
    ],
  };

  const orderBy: Prisma.ExpenseOrderByWithRelationInput =
    filter.sort === "category"
      ? { category: { name: filter.order } }
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
