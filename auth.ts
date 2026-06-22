import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // Override providers to add allowDangerousEmailAccountLinking,
  // which is a Node.js sign-in concern only.
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
  ],
});
