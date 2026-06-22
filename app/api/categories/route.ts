import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, badRequest, conflict, handleZod } from "@/lib/api";
import { categoryInputSchema } from "@/lib/validators";

function decimalOrNull(v: number | null | undefined) {
  if (v == null) return null;
  return new Prisma.Decimal(v);
}

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = categoryInputSchema.parse(body);

    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) return badRequest("Parent category does not exist");
      if (parent.parentId) return badRequest("Subcategories cannot have children");
    }

    const created = await prisma.category.create({
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        // Budgets only make sense on top-level categories.
        monthlyBudget: data.parentId ? null : decimalOrNull(data.monthlyBudget),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return conflict("A category with this name already exists at this level");
    }
    throw err;
  }
}
