import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  isErrorResponse,
  notFound,
  forbidden,
  conflict,
  handleZod,
} from "@/lib/api";
import { incomeUpdateSchema } from "@/lib/validators";

function normalizeMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  const existing = await prisma.incomeEntry.findUnique({ where: { id } });
  if (!existing) return notFound("Income entry not found");
  if (existing.userId !== session.user.id) {
    return forbidden("Only the owner can edit this income entry");
  }

  try {
    const body = await req.json();
    const data = incomeUpdateSchema.parse(body);

    const updated = await prisma.incomeEntry.update({
      where: { id },
      data: {
        month: data.month ? normalizeMonth(data.month) : undefined,
        vencimento: data.vencimento != null ? new Prisma.Decimal(data.vencimento) : undefined,
        isencaoHorario:
          data.isencaoHorario != null ? new Prisma.Decimal(data.isencaoHorario) : undefined,
        subFerias: data.subFerias != null ? new Prisma.Decimal(data.subFerias) : undefined,
        isencaoHorarioFerias:
          data.isencaoHorarioFerias != null
            ? new Prisma.Decimal(data.isencaoHorarioFerias)
            : undefined,
        subsidioNatal:
          data.subsidioNatal != null ? new Prisma.Decimal(data.subsidioNatal) : undefined,
        walletCoverflex:
          data.walletCoverflex != null ? new Prisma.Decimal(data.walletCoverflex) : undefined,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return conflict("An income entry for this month already exists");
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  const existing = await prisma.incomeEntry.findUnique({ where: { id } });
  if (!existing) return notFound("Income entry not found");
  if (existing.userId !== session.user.id) {
    return forbidden("Only the owner can delete this income entry");
  }

  await prisma.incomeEntry.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
