import type { ShoppingItemDTO } from "@/lib/api-client";

export type SortKey = "dueDate" | "name" | "createdAt";
export type Order = "asc" | "desc";

export type Filters = {
  bought?: "true" | "false";
  recurrence?: "DAILY" | "WEEKLY" | "MONTHLY";
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
  recurrence: "" | Recurrence;
  dueDate: string;
};

export const emptyForm = (): FormState => ({
  name: "",
  quantity: "",
  recurrence: "",
  dueDate: "",
});

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type _Item = ShoppingItemDTO;
