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

// `.partial()` alone isn't enough here: zod still applies a field's
// `.default()` whenever it's omitted, even on a partial schema — so a PATCH
// that only touches e.g. reimbursement (omitting isJoint/coverflexStatus)
// would silently reset those two back to false/"RECEIPT" instead of leaving
// them untouched. Overriding them with plain `.optional()` (no default)
// makes an omitted field actually mean "don't change this".
export const expenseUpdateSchema = expenseInputSchema.partial().extend({
  isJoint: z.boolean().optional(),
  coverflexStatus: coverflexStatusSchema.optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  parentId: z.string().min(1).optional().nullable(),
  monthlyBudget: z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v >= 0, "Invalid budget")
    .optional()
    .nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex code like #1192e8")
    .optional()
    .nullable(),
  visible: z.boolean().optional(),
});

export const categoryUpdateSchema = categoryInputSchema.partial();

export const reimburserInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

export const reimburserUpdateSchema = reimburserInputSchema.partial();

const nonNegativeAmount = z.coerce
  .number()
  .refine((v) => Number.isFinite(v) && v >= 0, "Invalid amount");

// A tax rate stored as a fraction (0.23 = 23%), not a whole percentage.
const pctSchema = z.coerce
  .number()
  .refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, "Must be between 0% and 100%");

export const incomeSourceTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  irsPct: pctSchema.default(0),
  ssPct: pctSchema.default(0),
  requiresNote: z.boolean().default(false),
  visible: z.boolean().default(true),
});

export const incomeSourceTypeUpdateSchema = incomeSourceTypeInputSchema.partial().extend({
  irsPct: pctSchema.optional(),
  ssPct: pctSchema.optional(),
  requiresNote: z.boolean().optional(),
  visible: z.boolean().optional(),
});

// A single rubric line within a month's income entry. `note` is enforced
// as required server-side once the line's source type is resolved (its
// `requiresNote` flag isn't knowable from the line payload alone).
export const incomeLineSchema = z.object({
  sourceTypeId: z.string().min(1, "Type is required"),
  grossAmount: nonNegativeAmount,
  irsPct: pctSchema,
  ssPct: pctSchema,
  note: z.string().trim().max(500).optional().nullable(),
});

export const incomeInputSchema = z.object({
  month: z.coerce.date(),
  lines: z.array(incomeLineSchema).min(1, "Add at least one income line"),
});

// A month's full set of lines is replaced wholesale on save (the edit
// dialog manages the whole list at once), so `lines` stays required here —
// only `month` is optional to update on its own.
export const incomeUpdateSchema = z.object({
  month: z.coerce.date().optional(),
  lines: z.array(incomeLineSchema).min(1, "Add at least one income line").optional(),
});

export const incomeFilterSchema = z.object({
  year: z.coerce.number().int().optional(),
  userId: z.string().optional(),
});

// Query params for multi-select filters arrive as a single comma-separated
// string (e.g. "id1,id2"); split and validate each entry.
const commaSeparated = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.length > 0 ? v.split(",") : undefined),
    z.array(itemSchema).optional(),
  );

export const expenseFilterSchema = z.object({
  categoryId: commaSeparated(z.string()),
  subcategoryId: commaSeparated(z.string()),
  userId: z.string().optional(),
  isJoint: commaSeparated(z.enum(["true", "false"])),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().optional(),
  reimburse: commaSeparated(z.enum(["awaiting", "received", "none"])),
  coverflexStatus: commaSeparated(coverflexStatusSchema),
  sort: z
    .enum([
      "date",
      "value",
      "description",
      "category",
      "createdAt",
      "coverflexStatus",
      "reimbursementAmount",
    ])
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
export type IncomeSourceTypeInput = z.infer<typeof incomeSourceTypeInputSchema>;
export type IncomeSourceTypeUpdate = z.infer<typeof incomeSourceTypeUpdateSchema>;
export type IncomeLineInput = z.infer<typeof incomeLineSchema>;
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

// See the comment on expenseUpdateSchema — without this, saving an edit
// (which omits `completed`) silently un-completes the task, and toggling
// `completed` alone (which omits `priority`) silently resets it to MEDIUM.
export const taskUpdateSchema = taskInputSchema.partial().extend({
  priority: taskPrioritySchema.optional(),
  completed: z.boolean().optional(),
});

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

// See the comment on expenseUpdateSchema — without this, saving an edit
// (which omits `bought`) silently un-marks the item as bought.
export const shoppingUpdateSchema = shoppingInputSchema.partial().extend({
  bought: z.boolean().optional(),
});

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
