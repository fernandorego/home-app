import type { TaskRecurrence } from "@/lib/validators";

/**
 * Advance a deadline by one recurrence period. If the current deadline is in
 * the past, we step forward from today instead so the next occurrence always
 * lands in the future.
 */
export function nextDeadline(current: Date, recurrence: TaskRecurrence): Date {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const base = current >= now ? new Date(current) : new Date(now);

  switch (recurrence) {
    case "DAILY":
      base.setDate(base.getDate() + 1);
      break;
    case "WEEKLY":
      base.setDate(base.getDate() + 7);
      break;
    case "MONTHLY":
      base.setMonth(base.getMonth() + 1);
      break;
  }
  return base;
}
