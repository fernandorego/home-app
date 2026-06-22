import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";

export type AuthedSession = {
  user: { id: string; email: string; name?: string | null; image?: string | null };
};

export async function requireSession(): Promise<AuthedSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session as AuthedSession;
}

export function isErrorResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function handleZod(err: unknown) {
  if (err instanceof ZodError) {
    return badRequest("Validation failed", err.flatten());
  }
  return null;
}
