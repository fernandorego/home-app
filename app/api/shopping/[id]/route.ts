import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  isErrorResponse,
  notFound,
  forbidden,
  handleZod,
} from "@/lib/api";
import { shoppingUpdateSchema, type TaskRecurrence } from "@/lib/validators";
import { nextDeadline } from "@/lib/recurrence";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  try {
    const body = await req.json();
    const data = shoppingUpdateSchema.parse(body);

    const existing = await prisma.shoppingItem.findUnique({ where: { id } });
    if (!existing) return notFound("Shopping item not found");
    if (existing.userId !== session.user.id) {
      return forbidden("Only the creator can edit this item");
    }

    // Recurrence behavior: marking a recurring item with a due date as bought
    // rolls the dueDate forward and keeps it in the active list.
    const boughtTransition =
      data.bought !== undefined && data.bought !== existing.bought;
    const effectiveRecurrence = (data.recurrence !== undefined
      ? data.recurrence
      : existing.recurrence) as TaskRecurrence | null | undefined;
    const isRolling =
      boughtTransition &&
      data.bought === true &&
      effectiveRecurrence != null &&
      existing.dueDate != null;

    const updated = await prisma.shoppingItem.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        quantity: data.quantity === undefined ? undefined : data.quantity,
        recurrence: data.recurrence === undefined ? undefined : data.recurrence,
        dueDate: isRolling
          ? nextDeadline(existing.dueDate!, effectiveRecurrence!)
          : data.dueDate === undefined
            ? undefined
            : data.dueDate,
        bought: isRolling ? false : data.bought ?? undefined,
        boughtAt: isRolling
          ? null
          : boughtTransition
            ? data.bought
              ? new Date()
              : null
            : undefined,
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  const existing = await prisma.shoppingItem.findUnique({ where: { id } });
  if (!existing) return notFound("Shopping item not found");
  if (existing.userId !== session.user.id) {
    return forbidden("Only the creator can delete this item");
  }

  await prisma.shoppingItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
