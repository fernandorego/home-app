import type { Prisma } from "@prisma/client";

/**
 * Server-enforced visibility filter: a user sees joint expenses + their own private ones.
 */
export function visibleExpenseWhere(userId: string): Prisma.ExpenseWhereInput {
  return { OR: [{ isJoint: true }, { userId }] };
}
