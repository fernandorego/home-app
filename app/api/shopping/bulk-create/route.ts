import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, handleZod } from "@/lib/api";
import { shoppingBulkCreateSchema } from "@/lib/validators";

// Paste a list (one name per line) and create every item at once, instead
// of adding them one by one through the inline create row.
export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = shoppingBulkCreateSchema.parse(body);

    const created = await prisma.shoppingItem.createManyAndReturn({
      data: data.names.map((name) => ({ name, userId: session.user.id })),
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        category: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}
