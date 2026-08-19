import { z } from "zod";

export const COVERFLEX_STATUSES = ["RECEIPT", "WAITING", "PAID"] as const;
export const coverflexStatusSchema = z.enum(COVERFLEX_STATUSES);
export type CoverflexStatus = z.infer<typeof coverflexStatusSchema>;

export const expenseInputSchema = z.object({
  value: z.coerce.number().refine((v) => Number.isFinite(v), "Invalid amount"),
  description: z.string().trim().min(1, "Description is required").max(200),
  comment: z.string().trim().max(2000).optional().nullable(),
  date: z.coerce.date(),
  isJoint: z.boolean().default(false),
  coverflexStatus: coverflexStatusSchema.default("RECEIPT"),
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().min(1).optional().nullable(),
  reimbursementAmount: z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v >= 0, "Invalid amount")
    .optional()
    .nullable(),
  reimburser: z.string().trim().max(120).optional().nullable(),
  reimbursedAt: z.coerce.date().optional().nullable(),
});

export const expenseUpdateSchema = expenseInputSchema.partial();

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  parentId: z.string().min(1).optional().nullable(),
  monthlyBudget: z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v >= 0, "Invalid budget")
    .optional()
    .nullable(),
});

export const categoryUpdateSchema = categoryInputSchema.partial();

export const reimburserInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

export const reimburserUpdateSchema = reimburserInputSchema.partial();

const nonNegativeAmount = z.coerce
  .number()
  .refine((v) => Number.isFinite(v) && v >= 0, "Invalid amount");

export const incomeInputSchema = z.object({
  month: z.coerce.date(),
  vencimento: nonNegativeAmount.default(0),
  isencaoHorario: nonNegativeAmount.default(0),
  subFerias: nonNegativeAmount.default(0),
  isencaoHorarioFerias: nonNegativeAmount.default(0),
  subsidioNatal: nonNegativeAmount.default(0),
  walletCoverflex: nonNegativeAmount.default(0),
});

export const incomeUpdateSchema = incomeInputSchema.partial();

export const incomeFilterSchema = z.object({
  year: z.coerce.number().int().optional(),
  userId: z.string().optional(),
});

export const expenseFilterSchema = z.object({
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  userId: z.string().optional(),
  isJoint: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v == null ? undefined : v === "true")),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().optional(),
  reimburse: z.enum(["awaiting", "received", "none"]).optional(),
  coverflexStatus: coverflexStatusSchema.optional(),
  sort: z
    .enum(["date", "value", "description", "category", "createdAt"])
    .optional()
    .default("date"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type ReimburserInput = z.infer<typeof reimburserInputSchema>;
export type ReimburserUpdate = z.infer<typeof reimburserUpdateSchema>;
export type IncomeInput = z.infer<typeof incomeInputSchema>;
export type IncomeUpdate = z.infer<typeof incomeUpdateSchema>;
export type IncomeFilter = z.infer<typeof incomeFilterSchema>;
export type ExpenseFilter = z.infer<typeof expenseFilterSchema>;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const TASK_RECURRENCES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export const taskRecurrenceSchema = z.enum(TASK_RECURRENCES);
export type TaskRecurrence = z.infer<typeof taskRecurrenceSchema>;

export const taskInputSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(500),
  priority: taskPrioritySchema.default("MEDIUM"),
  recurrence: taskRecurrenceSchema.optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),
  completed: z.boolean().default(false),
  assigneeId: z.string().min(1).optional().nullable(),
});

export const taskUpdateSchema = taskInputSchema.partial();

export const taskFilterSchema = z.object({
  priority: taskPrioritySchema.optional(),
  completed: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v == null ? undefined : v === "true")),
  assigneeId: z.string().optional(),
  q: z.string().optional(),
  sort: z
    .enum(["deadline", "priority", "description", "createdAt"])
    .optional()
    .default("deadline"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;

export const shoppingInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  quantity: z.string().trim().max(80).optional().nullable(),
  recurrence: taskRecurrenceSchema.optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  bought: z.boolean().default(false),
});

export const shoppingUpdateSchema = shoppingInputSchema.partial();

export const shoppingFilterSchema = z.object({
  bought: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v == null ? undefined : v === "true")),
  recurrence: taskRecurrenceSchema.optional(),
  q: z.string().optional(),
  sort: z.enum(["dueDate", "name", "createdAt"]).optional().default("dueDate"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ShoppingInput = z.infer<typeof shoppingInputSchema>;
export type ShoppingUpdate = z.infer<typeof shoppingUpdateSchema>;
export type ShoppingFilter = z.infer<typeof shoppingFilterSchema>;
