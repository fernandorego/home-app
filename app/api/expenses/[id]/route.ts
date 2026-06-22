import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  isErrorResponse,
  badRequest,
  notFound,
  forbidden,
  handleZod,
} from "@/lib/api";
import { expenseUpdateSchema } from "@/lib/validators";
import { visibleExpenseWhere } from "@/lib/visibility";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  try {
    const body = await req.json();
    const data = expenseUpdateSchema.parse(body);

    const existing = await prisma.expense.findFirst({
      where: { id, AND: visibleExpenseWhere(session.user.id) },
    });
    if (!existing) return notFound("Expense not found");
    if (existing.userId !== session.user.id && !existing.isJoint) {
      return forbidden("Only the creator can edit this expense");
    }

    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) return badRequest("Category does not exist");
      if (category.parentId) return badRequest("Pick a top-level category, not a subcategory");
    }

    const targetCategoryId = data.categoryId ?? existing.categoryId;
    if (data.subcategoryId) {
      const sub = await prisma.category.findUnique({ where: { id: data.subcategoryId } });
      if (!sub) return badRequest("Subcategory does not exist");
      if (sub.parentId !== targetCategoryId) {
        return badRequest("Subcategory does not belong to the selected category");
      }
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        value: data.value !== undefined ? new Prisma.Decimal(data.value) : undefined,
        description: data.description ?? undefined,
        comment: data.comment === undefined ? undefined : data.comment,
        date: data.date ?? undefined,
        isJoint: data.isJoint ?? undefined,
        categoryId: data.categoryId ?? undefined,
        subcategoryId: data.subcategoryId === undefined ? undefined : data.subcategoryId,
        reimbursementAmount:
          data.reimbursementAmount === undefined
            ? undefined
            : data.reimbursementAmount === null
              ? null
              : new Prisma.Decimal(data.reimbursementAmount),
        reimburser: data.reimburser === undefined ? undefined : data.reimburser,
        reimbursedAt: data.reimbursedAt === undefined ? undefined : data.reimbursedAt,
      },
      include: {
        category: true,
        subcategory: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  const existing = await prisma.expense.findFirst({
    where: { id, AND: visibleExpenseWhere(session.user.id) },
  });
  if (!existing) return notFound("Expense not found");
  if (existing.userId !== session.user.id && !existing.isJoint) {
    return forbidden("Only the creator can delete this expense");
  }

  await prisma.expense.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
