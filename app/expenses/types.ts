import type { CoverflexStatus } from "@/lib/api-client";

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
  coverflexStatus?: CoverflexStatus;
};

export type FormState = {
  value: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  date: string; // yyyy-mm-dd
  isJoint: boolean;
  coverflexStatus: CoverflexStatus;
  reimb: ReimbursementInput | null;
};

export const emptyForm = (date: string): FormState => ({
  value: "",
  description: "",
  categoryId: "",
  subcategoryId: "",
  date,
  isJoint: false,
  coverflexStatus: "RECEIPT",
  reimb: null,
});

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}
