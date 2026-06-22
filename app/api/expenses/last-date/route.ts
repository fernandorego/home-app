import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse } from "@/lib/api";
import { visibleExpenseWhere } from "@/lib/visibility";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const last = await prisma.expense.findFirst({
    where: visibleExpenseWhere(session.user.id),
    orderBy: { date: "desc" },
    select: { date: true },
  });

  return NextResponse.json({ date: last?.date ?? null });
}
