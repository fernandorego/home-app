import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse } from "@/lib/api";

// Removes every item currently marked bought — shared list, so this clears
// everyone's bought items, not just the caller's own.
export async function POST() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { count } = await prisma.shoppingItem.deleteMany({ where: { bought: true } });
  return NextResponse.json({ deleted: count });
}
