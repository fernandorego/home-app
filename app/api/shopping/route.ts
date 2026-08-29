import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, badRequest, handleZod } from "@/lib/api";
import { shoppingFilterSchema, shoppingInputSchema, TASK_PRIORITIES } from "@/lib/validators";

const shoppingInclude = {
  user: { select: { id: true, name: true, email: true, image: true } },
  category: true,
} as const;

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
      filter.priority ? { priority: filter.priority } : {},
      filter.categoryId
        ? filter.categoryId === "__none__"
          ? { categoryId: null }
          : { categoryId: filter.categoryId }
        : {},
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

  // Priority has no natural DB ordering — same in-memory approach as Tasks.
  if (filter.sort === "priority") {
    const allItems = await prisma.shoppingItem.findMany({ where, include: shoppingInclude });
    const rank = Object.fromEntries(TASK_PRIORITIES.map((p, i) => [p, i]));
    allItems.sort((a, b) => {
      const diff = (rank[a.priority] ?? 0) - (rank[b.priority] ?? 0);
      return filter.order === "asc" ? diff : -diff;
    });
    const total = allItems.length;
    const skip = (filter.page - 1) * filter.pageSize;
    const data = allItems.slice(skip, skip + filter.pageSize);
    return NextResponse.json({ data, total });
  }

  const skip = (filter.page - 1) * filter.pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.shoppingItem.findMany({
      where,
      orderBy: { [filter.sort]: filter.order },
      skip,
      take: filter.pageSize,
      include: shoppingInclude,
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

    if (data.categoryId) {
      const category = await prisma.listCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category || category.kind !== "SHOPPING") {
        return badRequest("Category does not exist");
      }
    }

    const created = await prisma.shoppingItem.create({
      data: {
        name: data.name,
        quantity: data.quantity ?? null,
        priority: data.priority,
        recurrence: data.recurrence ?? null,
        dueDate: data.dueDate ?? null,
        bought: data.bought,
        boughtAt: data.bought ? new Date() : null,
        categoryId: data.categoryId ?? null,
        userId: session.user.id,
      },
      include: shoppingInclude,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}
