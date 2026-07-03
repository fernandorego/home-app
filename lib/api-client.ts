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

export type ExpenseDTO = {
  id: string;
  value: string;
  description: string;
  comment: string | null;
  date: string;
  isJoint: boolean;
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
    monthRefundExpected: number;
    monthNet: number;
    lastMonthTotal: number;
    dailyAverage: number;
    daysInMonthSoFar: number;
    daysInCurrentMonth: number;
    projectedMonthTotal: number;
    jointThisMonth: number;
    privateThisMonth: number;
    largestExpense: {
      id: string;
      description: string;
      value: number;
      date: string;
      categoryName: string;
    } | null;
    reimbursedYTD: number;
    awaitingTotal: number;
    awaitingCount: number;
    awaitingDetails: Array<{
      id: string;
      description: string;
      date: string;
      value: number;
      amount: number;
      reimburser: string | null;
    }>;
    chartData: Array<Record<string, string | number>>;
    chartCategories: Array<{
      id: string;
      name: string;
      monthlyBudget: number | null;
      currentMonthValue: number;
      overBudget: boolean;
    }>;
    overBudgetThisMonth: Array<{
      id: string;
      name: string;
      budget: number;
      spent: number;
      overshoot: number;
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
    reimburserLeaderboard: Array<{
      name: string;
      total: number;
      count: number;
    }>;
  };
  tasks: Array<{
    id: string;
    description: string;
    priority: TaskDTO["priority"];
    recurrence: TaskDTO["recurrence"];
    deadline: string | null;
    assignee: { id: string; name: string | null; email: string } | null;
  }>;
  shopping: Array<{
    id: string;
    name: string;
    quantity: string | null;
    recurrence: ShoppingItemDTO["recurrence"];
    dueDate: string | null;
  }>;
};
