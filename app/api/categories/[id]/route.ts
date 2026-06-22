import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  isErrorResponse,
  badRequest,
  notFound,
  conflict,
  handleZod,
} from "@/lib/api";
import { categoryUpdateSchema } from "@/lib/validators";

function decimalOrNull(v: number | null | undefined) {
  if (v == null) return null;
  return new Prisma.Decimal(v);
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  try {
    const body = await req.json();
    const data = categoryUpdateSchema.parse(body);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return notFound("Category not found");

    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === id) return badRequest("Category cannot be its own parent");
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) return badRequest("Parent category does not exist");
      if (parent.parentId) return badRequest("Subcategories cannot have children");
    }

    // After applying any parent change, decide whether budget can persist
    const willHaveParent =
      data.parentId !== undefined ? data.parentId : existing.parentId;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        parentId: data.parentId === undefined ? undefined : data.parentId,
        monthlyBudget:
          data.monthlyBudget === undefined
            ? willHaveParent
              ? null // moved under a parent → drop any budget
              : undefined
            : willHaveParent
              ? null
              : decimalOrNull(data.monthlyBudget),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return conflict("A category with this name already exists at this level");
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  const inUse = await prisma.expense.count({
    where: { OR: [{ categoryId: id }, { subcategoryId: id }] },
  });
  if (inUse > 0) {
    return conflict("Category is in use by existing expenses");
  }

  try {
    await prisma.category.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return notFound("Category not found");
    }
    throw err;
  }
}
