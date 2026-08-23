import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, conflict, handleZod } from "@/lib/api";
import { incomeSourceTypeInputSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const types = await prisma.incomeSourceType.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = incomeSourceTypeInputSchema.parse(body);

    const created = await prisma.incomeSourceType.create({
      data: {
        name: data.name,
        irsPct: new Prisma.Decimal(data.irsPct),
        ssPct: new Prisma.Decimal(data.ssPct),
        requiresNote: data.requiresNote,
        visible: data.visible,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return conflict("An income type with this name already exists");
    }
    throw err;
  }
}
