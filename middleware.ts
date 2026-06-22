import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth;
  const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isSigninPage = nextUrl.pathname === "/signin";

  if (isAuthRoute || isSigninPage) return NextResponse.next();

  if (!isAuthed) {
    const url = new URL("/signin", nextUrl);
    url.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
