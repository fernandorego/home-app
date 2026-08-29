import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/api";
import type { IncomeLineInput } from "@/lib/validators";
import { decimalToNumber } from "@/lib/expense-math";

export function normalizeMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// `sign` flips a rubric like "Seguro de Saúde" to subtract from the month's
// total instead of adding to it (see IncomeSourceType.sign).
function lineNet(l: {
  grossAmount: number;
  irsPct: number;
  ssPct: number;
  sign: "ADD" | "SUBTRACT";
}): number {
  const amount = l.grossAmount * (1 - l.irsPct - l.ssPct);
  return l.sign === "SUBTRACT" ? -amount : amount;
}

// Every line's source type must exist, and any type flagged `requiresNote`
// (e.g. "Outro") must have a non-empty note on that line.
export async function validateLines(lines: IncomeLineInput[]) {
  const typeIds = [...new Set(lines.map((l) => l.sourceTypeId))];
  const types = await prisma.incomeSourceType.findMany({ where: { id: { in: typeIds } } });
  const typeById = new Map(types.map((t) => [t.id, t]));

  for (const line of lines) {
    const type = typeById.get(line.sourceTypeId);
    if (!type) return badRequest("Income type does not exist");
    if (type.requiresNote && !line.note?.trim()) {
      return badRequest(`"${type.name}" requires a description`);
    }
  }
  return null;
}

export const incomeEntryInclude = {
  user: { select: { id: true, name: true, email: true } as const },
  lines: { include: { sourceType: true } },
} satisfies Prisma.IncomeEntryInclude;

export function serializeIncomeEntry(
  entry: Prisma.IncomeEntryGetPayload<{ include: typeof incomeEntryInclude }>,
) {
  const lines = entry.lines.map((l) => {
    const grossAmount = decimalToNumber(l.grossAmount);
    const irsPct = decimalToNumber(l.irsPct);
    const ssPct = decimalToNumber(l.ssPct);
    return {
      id: l.id,
      sourceTypeId: l.sourceTypeId,
      sourceTypeName: l.sourceType.name,
      sourceTypeSign: l.sourceType.sign,
      grossAmount,
      irsPct,
      ssPct,
      net: lineNet({ grossAmount, irsPct, ssPct, sign: l.sourceType.sign }),
      note: l.note,
    };
  });
  return {
    id: entry.id,
    month: entry.month.toISOString(),
    userId: entry.userId,
    user: entry.user,
    lines,
    total: lines.reduce((s, l) => s + l.net, 0),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}
