import type { Prisma } from "@prisma/client";

/**
 * Server-enforced visibility filter: a user sees joint expenses + their own private ones.
 */
export function visibleExpenseWhere(userId: string): Prisma.ExpenseWhereInput {
  return { OR: [{ isJoint: true }, { userId }] };
}

/**
 * Categories hidden via the admin's visibility toggle are excluded from
 * every Home dashboard chart/total (but stay visible/editable on the
 * Expenses page). An expense is hidden if its top-level category is
 * hidden, or if it has a subcategory and that subcategory is hidden.
 */
export function dashboardVisibleExpenseWhere(): Prisma.ExpenseWhereInput {
  return {
    category: { visible: true },
    OR: [{ subcategoryId: null }, { subcategory: { visible: true } }],
  };
}
