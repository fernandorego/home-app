export type Paginated<T> = {
  data: T[];
  total: number;
};

export async function apiFetch<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type CategoryDTO = {
  id: string;
  name: string;
  parentId: string | null;
  monthlyBudget: string | null;
  color: string | null;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReimburserDTO = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type IncomeSourceTypeDTO = {
  id: string;
  name: string;
  irsPct: string;
  ssPct: string;
  requiresNote: boolean;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IncomeLineDTO = {
  id: string;
  sourceTypeId: string;
  sourceTypeName: string;
  grossAmount: number;
  irsPct: number;
  ssPct: number;
  net: number;
  note: string | null;
};

export type IncomeEntryDTO = {
  id: string;
  month: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
  lines: IncomeLineDTO[];
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type UserDTO = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type ShoppingItemDTO = {
  id: string;
  name: string;
  quantity: string | null;
  recurrence: "DAILY" | "WEEKLY" | "MONTHLY" | null;
  dueDate: string | null;
  bought: boolean;
  boughtAt: string | null;
  userId: string;
  user: UserDTO;
  createdAt: string;
  updatedAt: string;
};

export type TaskDTO = {
  id: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  recurrence: "DAILY" | "WEEKLY" | "MONTHLY" | null;
  deadline: string | null;
  completed: boolean;
  completedAt: string | null;
  userId: string;
  user: UserDTO;
  assigneeId: string | null;
  assignee: UserDTO | null;
  createdAt: string;
  updatedAt: string;
};

export type CoverflexStatus = "RECEIPT" | "WAITING" | "PAID";

export type ExpenseDTO = {
  id: string;
  value: string;
  description: string;
  comment: string | null;
  date: string;
  isJoint: boolean;
  coverflexStatus: CoverflexStatus;
  categoryId: string;
  category: { id: string; name: string };
  subcategoryId: string | null;
  subcategory: { id: string; name: string } | null;
  reimbursementAmount: string | null;
  reimburser: string | null;
  reimbursedAt: string | null;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type DashboardDTO = {
  monthLabel: string;
  expenses: {
    monthTotal: number;
    lastMonthTotal: number;
    monthExpenseDetails: Array<{
      id: string;
      description: string;
      date: string;
      value: number;
      categoryName: string;
    }>;
    awaitingTotal: number;
    awaitingCount: number;
    awaitingDetails: Array<{
      id: string;
      description: string;
      date: string;
      value: number;
      amount: number;
      reimburser: string | null;
      categoryName: string;
    }>;
    awaitingCoverflexTotal: number;
    awaitingCoverflexCount: number;
    awaitingCoverflexDetails: Array<{
      id: string;
      description: string;
      date: string;
      value: number;
      coverflexStatus: CoverflexStatus;
      categoryName: string;
    }>;
    chartData: Array<Record<string, string | number>>;
    chartCategories: Array<{
      id: string;
      name: string;
      monthlyBudget: number | null;
      currentMonthValue: number;
      overBudget: boolean;
    }>;
    topCategories: Array<{ name: string; total: number }>;
    pieRangeLabel: string;
    pieRangeTotal: number;
    cumulative: {
      data: Array<{
        day: number;
        thisMonth: number | null;
        lastMonth: number | null;
      }>;
      thisMonthTotal: number;
      lastMonthAtSameDay: number;
      lastMonthTotal: number;
    };
  };
};

export type IncomeVsExpensesDTO = {
  period: string;
  label: string;
  chartData: Array<{ label: string; income: number; expense: number }>;
  totalIncome: number;
  totalExpense: number;
  difference: number;
  comparison: {
    incomeTypeName: string;
    categoryName: string;
    available: boolean;
    data: Array<{ label: string; incomeAmount: number; expenseAmount: number }>;
  };
};

export type DashboardSettingDTO = {
  id: string;
  expensesIncomePct: string;
  updatedAt: string;
};
