export type SortKey = "date" | "value" | "description" | "category" | "createdAt";
export type Order = "asc" | "desc";

export type ReimbursementInput = {
  reimbursementAmount: number | null;
  reimburser: string | null;
  reimbursedAt: string | null;
};

export type Filters = {
  categoryId?: string;
  subcategoryId?: string;
  isJoint?: "true" | "false";
  from?: string;
  to?: string;
  q?: string;
  reimburse?: "awaiting" | "received" | "none";
};

export type FormState = {
  value: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  date: string; // yyyy-mm-dd
  isJoint: boolean;
  reimb: ReimbursementInput | null;
};

export const emptyForm = (date: string): FormState => ({
  value: "",
  description: "",
  categoryId: "",
  subcategoryId: "",
  date,
  isJoint: true,
  reimb: null,
});

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}
