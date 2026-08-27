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
import { incomeSourceTypeUpdateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  try {
    const body = await req.json();
    const data = incomeSourceTypeUpdateSchema.parse(body);

    const updated = await prisma.incomeSourceType.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        irsPct: data.irsPct !== undefined ? new Prisma.Decimal(data.irsPct) : undefined,
        ssPct: data.ssPct !== undefined ? new Prisma.Decimal(data.ssPct) : undefined,
        requiresNote: data.requiresNote ?? undefined,
        visible: data.visible ?? undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return conflict("An income type with this name already exists");
      if (err.code === "P2025") return notFound("Income type not found");
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  const inUse = await prisma.incomeLine.count({ where: { sourceTypeId: id } });
  if (inUse > 0) {
    return conflict("Income type is in use by existing income lines");
  }

  try {
    await prisma.incomeSourceType.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return notFound("Income type not found");
    }
    throw err;
  }
}
