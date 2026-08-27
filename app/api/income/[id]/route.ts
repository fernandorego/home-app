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
import {
  incomeEntryInclude,
  normalizeMonth,
  serializeIncomeEntry,
  validateLines,
} from "@/lib/income";

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

    if (data.lines) {
      const validationError = await validateLines(data.lines);
      if (validationError) return validationError;
    }

    // The edit dialog manages the whole line list at once, so a lines
    // update replaces the set wholesale rather than trying to diff it.
    const updated = await prisma.$transaction(async (tx) => {
      if (data.lines) {
        await tx.incomeLine.deleteMany({ where: { incomeEntryId: id } });
      }
      return tx.incomeEntry.update({
        where: { id },
        data: {
          month: data.month ? normalizeMonth(data.month) : undefined,
          lines: data.lines
            ? {
                create: data.lines.map((l) => ({
                  sourceTypeId: l.sourceTypeId,
                  grossAmount: new Prisma.Decimal(l.grossAmount),
                  irsPct: new Prisma.Decimal(l.irsPct),
                  ssPct: new Prisma.Decimal(l.ssPct),
                  note: l.note?.trim() || null,
                })),
              }
            : undefined,
        },
        include: incomeEntryInclude,
      });
    });

    return NextResponse.json(serializeIncomeEntry(updated));
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return conflict("An income entry for this month already exists");
      if (err.code === "P2025") return notFound("Income entry not found");
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
