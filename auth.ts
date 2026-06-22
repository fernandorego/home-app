import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const ALLOWED_EMAILS = new Set([
  "fernandoluisrego@gmail.com",
  "cristianavale03@gmail.com",
]);

const DISPLAY_NAMES: Record<string, string> = {
  "fernandoluisrego@gmail.com": "Nandinho",
  "cristianavale03@gmail.com": "Cris Cris",
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      // Google verifies the email it returns, so it's safe to attach an OAuth
      // account to an existing User row (e.g. one we pre-seeded via /api/users).
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // JWT strategy is required because the middleware runs on the Edge runtime,
  // where Prisma Client can't execute. The adapter still persists User and
  // Account rows on sign-in (that happens in the Node-runtime auth handler).
  session: { strategy: "jwt" },
  callbacks: {
    signIn: ({ profile }) =>
      !!profile?.email && ALLOWED_EMAILS.has(profile.email),
    jwt: ({ token, user }) => {
      // On first sign-in, the adapter passes the DB user; persist its id.
      if (user) token.id = user.id;
      return token;
    },
    session: ({ session, token }) => {
      const email = session.user?.email ?? "";
      const customName = DISPLAY_NAMES[email];
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          name: customName ?? session.user?.name ?? null,
        },
      };
    },
  },
  pages: {
    signIn: "/signin",
  },
});
