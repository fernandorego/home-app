import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse, conflict, handleZod } from "@/lib/api";
import { listCategoryInputSchema, listCategoryKindSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const kindParam = searchParams.get("kind");
  const parsedKind = listCategoryKindSchema.safeParse(kindParam);

  const categories = await prisma.listCategory.findMany({
    where: parsedKind.success ? { kind: parsedKind.data } : undefined,
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  try {
    const body = await req.json();
    const data = listCategoryInputSchema.parse(body);

    const created = await prisma.listCategory.create({
      data: { kind: data.kind, name: data.name, visible: data.visible },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const zodErr = handleZod(err);
    if (zodErr) return zodErr;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return conflict("A category with this name already exists for this list");
    }
    throw err;
  }
}
