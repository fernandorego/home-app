import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  isErrorResponse,
  badRequest,
  notFound,
  forbidden,
  handleZod,
} from "@/lib/api";
import { taskUpdateSchema, type TaskRecurrence } from "@/lib/validators";
import { nextDeadline } from "@/lib/recurrence";

type Ctx = { params: Promise<{ id: string }> };

const taskInclude = {
  user: { select: { id: true, name: true, email: true, image: true } },
  assignee: { select: { id: true, name: true, email: true, image: true } },
  category: true,
} as const;

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id } = await params;

  try {
    const body = await req.json();
    const data = taskUpdateSchema.parse(body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return notFound("Task not found");
    // The creator or the assignee can edit/complete — the assignee is the
    // one actually doing the task, so they need to be able to check it off
    // (or tweak details) even though they didn't create it.
    if (existing.userId !== session.user.id && existing.assigneeId !== session.user.id) {
      return forbidden("Only the creator or assignee can edit this task");
    }

    if (data.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
      if (!assignee) return badRequest("Assignee does not exist");
    }
    if (data.categoryId) {
      const category = await prisma.listCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category || category.kind !== "TASK") {
        return badRequest("Category does not exist");
      }
    }

    // Recurrence behavior: if the caller is marking this as completed, and the
    // task has a recurrence + a deadline, we instead roll the deadline forward
    // and keep it open. The task perpetually re-presents itself.
    const completedTransition =
      data.completed !== undefined && data.completed !== existing.completed;
    const effectiveRecurrence = (data.recurrence !== undefined
      ? data.recurrence
      : existing.recurrence) as TaskRecurrence | null | undefined;
    const isRolling =
      completedTransition &&
      data.completed === true &&
      effectiveRecurrence != null &&
      existing.deadline != null;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        description: data.description ?? undefined,
        notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
        priority: data.priority ?? undefined,
        recurrence: data.recurrence === undefined ? undefined : data.recurrence,
        deadline: isRolling
          ? nextDeadline(existing.deadline!, effectiveRecurrence!)
          : data.deadline === undefined
            ? undefined
            : data.deadline,
        completed: isRolling ? false : data.completed ?? undefined,
        completedAt: isRolling
          ? null
          : completedTransition
            ? data.completed
              ? new Date()
              : null
            : undefined,
        assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId,
        categoryId: data.categoryId === undefined ? undefined : data.categoryId,
      },
      include: taskInclude,
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

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return notFound("Task not found");
  if (existing.userId !== session.user.id) {
    return forbidden("Only the creator can delete this task");
  }

  await prisma.task.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
