import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isErrorResponse } from "@/lib/api";

// The two known household members. Pre-seeded so they can be picked as assignees
// even before they've signed in for the first time.
const KNOWN_MEMBERS: Array<{ email: string; name: string }> = [
  { email: "fernandoluisrego@gmail.com", name: "Nandinho" },
  { email: "cristianavale03@gmail.com", name: "Cris Cris" },
];

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  // Update name on every call so the canonical display names always reflect the
  // constants above (handy if we ever rename them again).
  await Promise.all(
    KNOWN_MEMBERS.map((m) =>
      prisma.user.upsert({
        where: { email: m.email },
        update: { name: m.name },
        create: { email: m.email, name: m.name },
      }),
    ),
  );

  const users = await prisma.user.findMany({
    where: { email: { in: KNOWN_MEMBERS.map((m) => m.email) } },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
