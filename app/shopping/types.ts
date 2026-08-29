import type { ShoppingItemDTO } from "@/lib/api-client";

export type SortKey = "dueDate" | "name" | "createdAt" | "priority";
export type Order = "asc" | "desc";

export type Filters = {
  bought?: "true" | "false";
  recurrence?: "DAILY" | "WEEKLY" | "MONTHLY";
  priority?: ShoppingItemDTO["priority"];
  categoryId?: string; // "__none__" or a real category id
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
  name: string;
  quantity: string;
  priority: ShoppingItemDTO["priority"];
  recurrence: "" | Recurrence;
  dueDate: string;
  categoryId: string; // category id or "" for none
};

export const emptyForm = (): FormState => ({
  name: "",
  quantity: "",
  priority: "MEDIUM",
  recurrence: "",
  dueDate: "",
  categoryId: "",
});

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type _Item = ShoppingItemDTO;
