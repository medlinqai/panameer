import type { NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { deriveAccessFlags } from "@/lib/access";
import { getActorFlags, NO_ACTOR_FLAGS } from "@/lib/actor-flags";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { linkOAuthUser, oauthConfig } from "@/lib/oauth";
import { consumeSignInToken } from "@/lib/verification";

const MAX_FAILED_LOGINS = 5;

const LOCKOUT_MINUTES = 30;

function lockActive(user: { locked: boolean; locked_until: Date | null }): boolean {
  if (!user.locked) return false;
  if (!user.locked_until) return true;
  return user.locked_until.getTime() > Date.now();
}

async function releaseExpiredLock(user: {
  id: string;
  locked: boolean;
  locked_until: Date | null;
}) {
  if (!user.locked || !user.locked_until) return;
  if (user.locked_until.getTime() > Date.now()) return;
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { locked: false, locked_until: null, failed_login_attempts: 0 },
    });
  } catch {
    /* best-effort */
  }
}

function oauthProviders(): Provider[] {
  const providers: Provider[] = [];

  if (oauthConfig.google()) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // Always show the chooser; users often hold several Google accounts.
        authorization: { params: { prompt: "select_account" } },
      })
    );
  }

  if (oauthConfig.apple()) {
    providers.push(
      AppleProvider({
        clientId: process.env.APPLE_CLIENT_ID!,
        // Apple's "secret" is a signed JWT the operator generates; we take it
        // as-is from env so no signing key ever lives in the repo.
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
      })
    );
  }

  return providers;
}

function sessionCookieDomain(): string | undefined {
  try {
    const host = new URL(process.env.NEXTAUTH_URL ?? "").hostname.toLowerCase();
    if (host === "panameer.com" || host.endsWith(".panameer.com")) return ".panameer.com";
  } catch {
    /* NEXTAUTH_URL unset or unparseable — fall through to the default. */
  }
  return undefined;
}

const USE_SECURE_COOKIES = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

export const authOptions: NextAuthOptions = {
  providers: [
    ...oauthProviders(),

    CredentialsProvider({
      id: "verify-token",
      name: "verify-token",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token) return null;

        const consumed = await consumeSignInToken(token);
        if (!consumed) return null;

        const user = await prisma.user.findUnique({
          where: { id: consumed.id },
        });
        if (!user || user.is_active === false) return null;
        if (lockActive(user)) return null;
        await releaseExpiredLock(user);

        await prisma.user
          .update({
            where: { id: user.id },
            data: { failed_login_attempts: 0, last_login: new Date() },
          })
          .catch(() => {
            /* best-effort */
          });

        const flags = deriveAccessFlags({
          role: user.role,
          isSystemAdmin: user.is_system_admin,
        });
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

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Emails are STORED normalized (trim+lowercase), so the free-typed
        // password (brief_O).
        const user = await prisma.user.findUnique({
          where: { email: normalizeEmail(credentials.email) },
        });
        if (!user || !user.password_hash) return null;

        if (user.is_active === false) return null;
        if (lockActive(user)) return null;
        await releaseExpiredLock(user);

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
                ...(attempts >= MAX_FAILED_LOGINS
                  ? {
                      locked: true,
                      locked_until: new Date(Date.now() + LOCKOUT_MINUTES * 60_000),
                    }
                  : {}),
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
            data: {
              failed_login_attempts: 0,
              locked_until: null,
              last_login: new Date(),
            },
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
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: `${USE_SECURE_COOKIES ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: USE_SECURE_COOKIES,
        ...(sessionCookieDomain() ? { domain: sessionCookieDomain() } : {}),
      },
    },
  },
  callbacks: {
    /** OAuth create-or-link (brief_Q). */
    async signIn({ user, account, profile }) {
      // Both credentials-style providers resolve their own Panameer user.
      if (
        !account ||
        account.provider === "credentials" ||
        account.provider === "verify-token"
      ) {
        return true;
      }

      const raw = (profile ?? {}) as Record<string, unknown>;
      // Google sends `email_verified`; Apple sends it as a string.
      // Absent claim ⇒ treat as unverified and refuse to auto-link.
      const verifiedClaim = raw.email_verified;
      const emailVerified =
        verifiedClaim === true ||
        verifiedClaim === "true" ||
        // Apple only returns the email on the FIRST authorization, and only
        // ever for an address it owns and has verified itself.
        (account.provider === "apple" && Boolean(user.email));

      const result = await linkOAuthUser({
        provider: account.provider,
        email: user.email ?? (raw.email as string | undefined),
        emailVerified,
        name: user.name ?? (raw.name as string | undefined),
        firstName: raw.given_name as string | undefined,
        lastName: raw.family_name as string | undefined,
        image: user.image ?? (raw.picture as string | undefined),
      });

      if (!result.ok) {
        console.warn(
          `[auth] ${account.provider} sign-in refused: ${result.reason}`
        );
        // Surfaces on /login as ?error=… so the user gets a reason.
        return `/login?error=OAuth${result.reason}`;
      }

      // Rewrite to OUR user id so the JWT identifies a Panameer user.
      user.id = result.userId;
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      if (
        user &&
        account &&
        account.provider !== "credentials" &&
        account.provider !== "verify-token"
      ) {
        // OAuth: `user` came from the provider, so the app-specific fields were
        // never populated by `authorize()`. Load them from the linked row.
        token.sub = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, is_system_admin: true },
        });
        const flags = deriveAccessFlags({
          role: dbUser?.role ?? "MEMBER",
          isSystemAdmin: dbUser?.is_system_admin ?? false,
        });
        const actor = await getActorFlags(user.id);
        token.role = dbUser?.role ?? "MEMBER";
        token.isSystemAdmin = dbUser?.is_system_admin ?? false;
        token.isAdmin = flags.isAdmin;
        token.isServiceBuyer = actor.isServiceBuyer;
        token.isServiceProvider = actor.isServiceProvider;
        token.isServiceCoordinator = actor.isServiceCoordinator;
        token.isSupport = actor.isSupport;
        return token;
      }

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
