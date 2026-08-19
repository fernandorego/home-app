import type { Prisma } from "@prisma/client";

export function decimalToNumber(
  v: Prisma.Decimal | string | number | null | undefined,
): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

// The user's real cost for an expense: reimbursed amounts aren't a personal
// cost, and joint expenses are split 50/50 (Coverflex-tracked expenses are
// not treated any differently).
export function userCost(
  value: number,
  reimbursementAmount: number,
  isJoint: boolean,
): number {
  const net = value - reimbursementAmount;
  return isJoint ? net / 2 : net;
}
