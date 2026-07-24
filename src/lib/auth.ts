import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deriveAccessFlags } from "@/lib/access";
import { getActorFlags, NO_ACTOR_FLAGS } from "@/lib/actor-flags";

const MAX_FAILED_LOGINS = 5;

/**
 * NextAuth v4 options (credentials provider) — matches Medlinq's pattern:
 * bcrypt password compare, account lockout after repeated failures, JWT
 * sessions, and an `isSystemAdmin` gate carried into the token/session.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password_hash) return null;

        // A locked or deactivated user cannot authenticate — checked before compare.
        if (user.locked === true || user.is_active === false) return null;

        const ok = await bcrypt.compare(credentials.password, user.password_hash);
        if (!ok) {
          // Track failures; auto-lock at the threshold. Best-effort — a tracking
          // write must never break authentication.
          const attempts = (user.failed_login_attempts ?? 0) + 1;
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failed_login_attempts: attempts,
                ...(attempts >= MAX_FAILED_LOGINS ? { locked: true } : {}),
              },
            });
          } catch {
            /* best-effort */
          }
          return null;
        }

        // Success — reset the counter + stamp last_login (best-effort).
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { failed_login_attempts: 0, last_login: new Date() },
          });
        } catch {
          /* best-effort */
        }

        const flags = deriveAccessFlags({
          role: user.role,
          isSystemAdmin: user.is_system_admin,
        });

        // Actor roles from the linked Person, so the JWT carries them (brief_J).
        const actor = await getActorFlags(user.id);

        return {
          id: user.id,
          email: user.email,
          name:
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.email,
          role: user.role,
          isSystemAdmin: user.is_system_admin,
          isAdmin: flags.isAdmin,
          ...actor,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Sign-in: copy admin fields + actor flags from authorize().
        token.role = user.role;
        token.isSystemAdmin = user.isSystemAdmin;
        token.isAdmin = user.isAdmin;
        token.isServiceBuyer = user.isServiceBuyer;
        token.isServiceProvider = user.isServiceProvider;
        token.isServiceCoordinator = user.isServiceCoordinator;
        token.isSupport = user.isSupport;
      } else if (trigger === "update" && token.sub) {
        // Role-change refresh: when a user gains a role mid-session (finishes
        // provider onboarding, accepts a coordinator invite), the client calls
        // useSession().update() and we re-read the actor flags from the linked
        // Person — the only place a per-request DB read happens.
        const actor = await getActorFlags(token.sub);
        token.isServiceBuyer = actor.isServiceBuyer;
        token.isServiceProvider = actor.isServiceProvider;
        token.isServiceCoordinator = actor.isServiceCoordinator;
        token.isSupport = actor.isSupport;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = (token.role as string) ?? "MEMBER";
        session.user.isSystemAdmin = (token.isSystemAdmin as boolean) ?? false;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.isServiceBuyer =
          token.isServiceBuyer ?? NO_ACTOR_FLAGS.isServiceBuyer;
        session.user.isServiceProvider =
          token.isServiceProvider ?? NO_ACTOR_FLAGS.isServiceProvider;
        session.user.isServiceCoordinator =
          token.isServiceCoordinator ?? NO_ACTOR_FLAGS.isServiceCoordinator;
        session.user.isSupport = token.isSupport ?? NO_ACTOR_FLAGS.isSupport;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
