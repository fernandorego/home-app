import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  isErrorResponse,
  badRequest,
  handleZod,
} from "@/lib/api";
import {
  taskFilterSchema,
  taskInputSchema,
  TASK_PRIORITIES,
} from "@/lib/validators";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());

  let filter;
  try {
    filter = taskFilterSchema.parse(params);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }

  const where: Prisma.TaskWhereInput = {
    AND: [
      filter.priority ? { priority: filter.priority } : {},
      filter.completed !== undefined ? { completed: filter.completed } : {},
      filter.assigneeId
        ? filter.assigneeId === "unassigned"
          ? { assigneeId: null }
          : { assigneeId: filter.assigneeId }
        : {},
      filter.q ? { description: { contains: filter.q } } : {},
    ],
  };

  const include = {
    user: { select: { id: true, name: true, email: true, image: true } },
    assignee: { select: { id: true, name: true, email: true, image: true } },
  } as const;

  // Priority has no natural DB ordering — fetch all matching rows, sort in
  // memory, then slice for the requested page.
  if (filter.sort === "priority") {
    const allTasks = await prisma.task.findMany({ where, include });
    const rank = Object.fromEntries(TASK_PRIORITIES.map((p, i) => [p, i]));
    allTasks.sort((a, b) => {
      const diff = (rank[a.priority] ?? 0) - (rank[b.priority] ?? 0);
      return filter.order === "asc" ? diff : -diff;
    });
    const total = allTasks.length;
    const skip = (filter.page - 1) * filter.pageSize;
    const data = allTasks.slice(skip, skip + filter.pageSize);
    return NextResponse.json({ data, total });
  }

  const skip = (filter.page - 1) * filter.pageSize;

  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      orderBy: { [filter.sort]: filter.order },
      skip,
      take: filter.pageSize,
      include,
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({ data: tasks, total });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = taskInputSchema.parse(body);

    if (data.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
      });
      if (!assignee) return badRequest("Assignee does not exist");
    }

    const created = await prisma.task.create({
      data: {
        description: data.description,
        priority: data.priority,
        recurrence: data.recurrence ?? null,
        deadline: data.deadline ?? null,
        completed: data.completed,
        completedAt: data.completed ? new Date() : null,
        assigneeId: data.assigneeId ?? null,
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}
