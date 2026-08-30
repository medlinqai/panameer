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

/**
 * HOW LONG THE AUTO-LOCK LASTS (`P1-J1.1-E252a`, 2026-08-30).
 *
 * ⚠⚠ THE LOCK USED TO BE A ONE-WAY DOOR. `locked: true` was set here at
 * `MAX_FAILED_LOGINS` and checked BEFORE the password compare, and there is no
 * reset, unlock or forgot-password route anywhere in `src/app` — so five wrong
 * guesses removed an account from the product permanently. Scott did this to
 * `admin@panameer.com` on 2026-08-30 and the only way back was a hand-written
 * script against the database.
 *
 * Thirty minutes is the cooling-off window: long enough that online guessing at
 * five-per-window is not worth attempting, short enough that a real person who
 * fat-fingered their password gets back in without needing anybody.
 *
 * ⚠ THIS IS NOT `E252b`. Self-serve password reset needs working email
 * (`RESEND_API_KEY` / `EMAIL_FROM` are still unset) and is explicitly a later
 * brief. This row only stops the lock being permanent.
 */
const LOCKOUT_MINUTES = 30;

/**
 * Is this account locked RIGHT NOW?
 *
 * ⚠ `locked === true` WITH A NULL `locked_until` IS AN INDEFINITE LOCK and stays
 * one, deliberately — that is the shape an admin hard-lock takes, and a
 * cooling-off window must not quietly release it. Only a lock that named its own
 * expiry can expire.
 */
function lockActive(user: { locked: boolean; locked_until: Date | null }): boolean {
  if (!user.locked) return false;
  if (!user.locked_until) return true;
  return user.locked_until.getTime() > Date.now();
}

/**
 * Clear an auto-lock whose window has passed, so the account heals itself on the
 * next attempt rather than waiting for an admin.
 *
 * Best-effort: a bookkeeping write must never be the reason a valid credential
 * is refused, which is the same contract the counter writes below follow.
 */
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

/**
 * OAuth providers, registered ONLY when their credentials exist (brief_Q).
 *
 * Built inside a function rather than at module scope so the env read is lazy —
 * the same rule as the Resend/Twilio clients (pitfalls.md). With no credentials
 * set, the array is empty, `/api/auth/providers` reports credentials only, the
 * social buttons render disabled, and the build stays clean.
 */
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

/**
 * NextAuth v4 options — matches Medlinq's pattern: bcrypt password compare,
 * account lockout after repeated failures, JWT sessions, and an `isSystemAdmin`
 * gate carried into the token/session. brief_Q adds Google /
 * Apple alongside credentials.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    ...oauthProviders(),

    /**
     * Sign-in handoff for the email verification link (brief_S / E022).
     *
     * HARD REQUIREMENT: clicking verify must land the provider inside
     * onboarding already authenticated — never on a login screen. A GET page
     * can't mint a NextAuth session, so `/verify-email` validates the email
     * token, issues a single-use SIGNIN token, and posts it here to be
     * exchanged for a real session.
     *
     * This is NOT a password bypass: the token is minted only after a valid
     * email-verification token, stored as a hash, expires in five minutes, is
     * consumed on first use, and is refused for locked/inactive accounts.
     */
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
        /* `E252a` — an EXPIRED auto-lock is not a lock. Same rule as the
           credentials path below, so a magic link and a password agree. */
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
        // login value must be normalized too — otherwise "Scott@x.com" finds no
        // row for an account registered as "scott@x.com" and reads as a bad
        // password (brief_O).
        const user = await prisma.user.findUnique({
          where: { email: normalizeEmail(credentials.email) },
        });
        if (!user || !user.password_hash) return null;

        /*
          A locked or deactivated user cannot authenticate — checked before the
          compare, so a locked account leaks nothing about its password.

          ⚠ `E252a`: "locked" now means "locked RIGHT NOW". A lock whose
          `locked_until` has passed is released and the attempt proceeds — that
          release is what makes the lock a cooling-off window instead of a
          permanent exile. An indefinite lock (`locked_until` null) still refuses.
        */
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
                /* `E252a` — the lock now names its own expiry. `locked` without
                   `locked_until` would be the permanent door this row removed. */
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
            /* `E252a` — a successful sign-in clears the window too, so a stale
               `locked_until` cannot re-lock a healthy account later. */
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
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * OAuth create-or-link (brief_Q).
     *
     * With JWT sessions and no Prisma adapter, NextAuth would otherwise hand us
     * a token whose `sub` is the PROVIDER's account id and never touch our
     * database. So we resolve (or create) the Panameer User here and rewrite
     * `user.id` to our own id — `jwt` then carries the real user through.
     *
     * Fails CLOSED: no email, an unverified email, or a locked/inactive account
     * all deny the sign-in.
     */
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
