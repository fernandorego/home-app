import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, handleZod } from "@/lib/api";
import { shoppingFilterSchema, shoppingInputSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());

  let filter;
  try {
    filter = shoppingFilterSchema.parse(params);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }

  const where: Prisma.ShoppingItemWhereInput = {
    AND: [
      filter.bought !== undefined ? { bought: filter.bought } : {},
      filter.recurrence ? { recurrence: filter.recurrence } : {},
      filter.q
        ? {
            OR: [
              { name: { contains: filter.q } },
              { quantity: { contains: filter.q } },
            ],
          }
        : {},
    ],
  };

  const skip = (filter.page - 1) * filter.pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.shoppingItem.findMany({
      where,
      orderBy: { [filter.sort]: filter.order },
      skip,
      take: filter.pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.shoppingItem.count({ where }),
  ]);

  return NextResponse.json({ data: items, total });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = shoppingInputSchema.parse(body);

    const created = await prisma.shoppingItem.create({
      data: {
        name: data.name,
        quantity: data.quantity ?? null,
        recurrence: data.recurrence ?? null,
        dueDate: data.dueDate ?? null,
        bought: data.bought,
        boughtAt: data.bought ? new Date() : null,
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}
