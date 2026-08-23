import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, handleZod } from "@/lib/api";
import { dashboardSettingUpdateSchema } from "@/lib/validators";

// Single-row settings table — there's only ever one, created on first read.
async function getOrCreateSettings() {
  const existing = await prisma.dashboardSetting.findFirst();
  if (existing) return existing;
  return prisma.dashboardSetting.create({ data: {} });
}

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const settings = await getOrCreateSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = dashboardSettingUpdateSchema.parse(body);

    const existing = await getOrCreateSettings();
    const updated = await prisma.dashboardSetting.update({
      where: { id: existing.id },
      data: { expensesIncomePct: new Prisma.Decimal(data.expensesIncomePct) },
    });
    return NextResponse.json(updated);
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    throw err;
  }
}
