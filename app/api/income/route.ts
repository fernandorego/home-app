import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, conflict, handleZod } from "@/lib/api";
import { incomeInputSchema, incomeFilterSchema } from "@/lib/validators";

function normalizeMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

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
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = incomeInputSchema.parse(body);

    const created = await prisma.incomeEntry.create({
      data: {
        month: normalizeMonth(data.month),
        vencimento: new Prisma.Decimal(data.vencimento),
        isencaoHorario: new Prisma.Decimal(data.isencaoHorario),
        subFerias: new Prisma.Decimal(data.subFerias),
        isencaoHorarioFerias: new Prisma.Decimal(data.isencaoHorarioFerias),
        subsidioNatal: new Prisma.Decimal(data.subsidioNatal),
        walletCoverflex: new Prisma.Decimal(data.walletCoverflex),
        userId: session.user.id,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return conflict("An income entry for this month already exists");
    }
    throw err;
  }
}
