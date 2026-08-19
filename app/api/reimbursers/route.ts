import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, conflict, handleZod } from "@/lib/api";
import { reimburserInputSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const reimbursers = await prisma.reimburser.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(reimbursers);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = reimburserInputSchema.parse(body);

    const created = await prisma.reimburser.create({
      data: { name: data.name },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return conflict("A reimburser with this name already exists");
    }
    throw err;
  }
}
