import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const ALLOWED_EMAILS = new Set([
  "fernandoluisrego@gmail.com",
  "cristianavale03@gmail.com",
]);

const DISPLAY_NAMES: Record<string, string> = {
  "fernandoluisrego@gmail.com": "Nandinho",
  "cristianavale03@gmail.com": "Cris Cris",
};

export const authConfig: NextAuthConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    signIn: ({ profile }) =>
      !!profile?.email && ALLOWED_EMAILS.has(profile.email),
    jwt: ({ token, user }) => {
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
};
