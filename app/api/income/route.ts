import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, conflict, handleZod } from "@/lib/api";
import { incomeInputSchema, incomeFilterSchema } from "@/lib/validators";
import {
  incomeEntryInclude,
  normalizeMonth,
  serializeIncomeEntry,
  validateLines,
} from "@/lib/income";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());

  let filter;
  try {
    filter = incomeFilterSchema.parse(params);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }

  const entries = await prisma.incomeEntry.findMany({
    where: {
      AND: [
        filter.year
          ? {
              month: {
                gte: new Date(Date.UTC(filter.year, 0, 1)),
                lt: new Date(Date.UTC(filter.year + 1, 0, 1)),
              },
            }
          : {},
        filter.userId ? { userId: filter.userId } : {},
      ],
    },
    orderBy: [{ month: "desc" }, { userId: "asc" }],
    include: incomeEntryInclude,
  });

  return NextResponse.json(entries.map(serializeIncomeEntry));
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = incomeInputSchema.parse(body);

    const validationError = await validateLines(data.lines);
    if (validationError) return validationError;

    const created = await prisma.incomeEntry.create({
      data: {
        month: normalizeMonth(data.month),
        userId: session.user.id,
        lines: {
          create: data.lines.map((l) => ({
            sourceTypeId: l.sourceTypeId,
            grossAmount: new Prisma.Decimal(l.grossAmount),
            irsPct: new Prisma.Decimal(l.irsPct),
            ssPct: new Prisma.Decimal(l.ssPct),
            note: l.note?.trim() || null,
          })),
        },
      },
      include: incomeEntryInclude,
    });
    return NextResponse.json(serializeIncomeEntry(created), { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return conflict("An income entry for this month already exists");
    }
    throw err;
  }
}
