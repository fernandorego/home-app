import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, handleZod } from "@/lib/api";
import { taskBulkActionSchema, type TaskRecurrence } from "@/lib/validators";
import { nextDeadline } from "@/lib/recurrence";

// Bulk-complete or bulk-delete a set of tasks. Rows the caller isn't
// allowed to touch are silently skipped rather than failing the whole
// batch — the response reports how many were actually affected.
export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = taskBulkActionSchema.parse(body);

    const tasks = await prisma.task.findMany({ where: { id: { in: data.ids } } });

    if (data.action === "delete") {
      // Only the creator can delete.
      const ids = tasks.filter((t) => t.userId === session.user.id).map((t) => t.id);
      if (ids.length === 0) return NextResponse.json({ affected: 0 });
      await prisma.task.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ affected: ids.length });
    }

    // "complete" — creator or assignee, same roll-forward rule as the
    // single-task PATCH: a recurring task with a deadline rolls forward
    // instead of actually being marked done.
    const allowed = tasks.filter(
      (t) => t.userId === session.user.id || t.assigneeId === session.user.id,
    );
    let affected = 0;
    for (const t of allowed) {
      if (t.completed) continue; // already done, nothing to do
      const recurrence = t.recurrence as TaskRecurrence | null;
      const isRolling = recurrence != null && t.deadline != null;
      await prisma.task.update({
        where: { id: t.id },
        data: isRolling
          ? { deadline: nextDeadline(t.deadline!, recurrence!), completed: false, completedAt: null }
          : { completed: true, completedAt: new Date() },
      });
      affected += 1;
    }
    return NextResponse.json({ affected });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}
