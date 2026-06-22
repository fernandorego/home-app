import type { TaskDTO } from "@/lib/api-client";

export type SortKey = "deadline" | "priority" | "description" | "createdAt";
export type Order = "asc" | "desc";

export type Filters = {
  priority?: TaskDTO["priority"];
  completed?: "true" | "false";
  assigneeId?: string; // "unassigned" or a real user id
  q?: string;
};

export const RECURRENCES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type Recurrence = (typeof RECURRENCES)[number];
export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export type FormState = {
  description: string;
  priority: TaskDTO["priority"];
  recurrence: "" | Recurrence;
  deadline: string; // yyyy-mm-dd or empty
  assigneeId: string; // user id or "" for unassigned
};

export const emptyForm = (): FormState => ({
  description: "",
  priority: "MEDIUM",
  recurrence: "",
  deadline: "",
  assigneeId: "",
});

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
