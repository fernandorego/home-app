import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  isErrorResponse,
  notFound,
  conflict,
  handleZod,
} from "@/lib/api";
import { listCategoryUpdateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  try {
    const body = await req.json();
    const data = listCategoryUpdateSchema.parse(body);

    const updated = await prisma.listCategory.update({
      where: { id },
      data: { name: data.name ?? undefined, visible: data.visible ?? undefined },
    });
    return NextResponse.json(updated);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return conflict("A category with this name already exists for this list");
      if (err.code === "P2025") return notFound("Category not found");
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  const [taskCount, shoppingCount] = await Promise.all([
    prisma.task.count({ where: { categoryId: id } }),
    prisma.shoppingItem.count({ where: { categoryId: id } }),
  ]);
  if (taskCount + shoppingCount > 0) {
    return conflict("Category is in use by existing tasks or shopping items");
  }

  try {
    await prisma.listCategory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return notFound("Category not found");
    }
    throw err;
  }
}
