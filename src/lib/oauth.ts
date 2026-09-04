import { prisma } from "@/lib/prisma";
/* ⚠ `P1-ALL-E384` — the ToS is the MSA (`E380`); every account-creating path
   records acceptance in the same transaction. */
import { USER_TOS_VERSION } from "@/lib/tos";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { capitalizeName } from "@/lib/display";

/**
 * OAuth account creation + linking (brief_Q).
 *
 * Panameer runs NextAuth with JWT sessions and NO Prisma adapter (locked in
 * brief_E), so there is no `Account` table doing the linking for us. Identity is
 * keyed on the NORMALIZED EMAIL (brief_O), which is exactly what the brief asks
 * for: one click creates the User, or LINKS to the existing one — never a
 * duplicate row for the same address.
 *
 * SECURITY — why the `emailVerified` check below is not optional:
 * linking a provider identity to a pre-existing password account purely because
 * the email strings match is the classic "pre-hijack / automatic account
 * linking" hole. It is only safe when the PROVIDER asserts the address is
 * verified. Google returns that claim; Apple returns
 * `email_verified` too (as a string or boolean). If a provider ever hands us an
 * unverified address we refuse the sign-in rather than take the risk.
 */

export type OAuthProfileInput = {
  provider: string;
  email: string | null | undefined;
  /** Provider's assertion that it owns/verified the address. */
  emailVerified: boolean;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
};

export type OAuthLinkResult =
  | { ok: true; userId: string; created: boolean }
  | {
      ok: false;
      reason: "no_email" | "unverified_email" | "locked" | "inactive";
    };

/** Split a provider's display name into first/last, best effort. */
function splitName(name: string | null | undefined): {
  first: string;
  last: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * Create or link the User behind an OAuth sign-in.
 *
 * Deliberately does NOT create the Person/ProviderProfile backbone: signing in
 * with Google says nothing about whether someone is a buyer or a provider. The
 * join flow, which knows that intent, creates the backbone afterwards (see
 * `ensureProviderBackbone`). OAuth fills identity only.
 */
export async function linkOAuthUser(
  input: OAuthProfileInput
): Promise<OAuthLinkResult> {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, reason: "no_email" };
  if (!input.emailVerified) return { ok: false, reason: "unverified_email" };

  const named = splitName(input.name);
  const first = capitalizeName(input.firstName || named.first);
  const last = capitalizeName(input.lastName || named.last);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // A locked or deactivated account must not be revivable through a social
    // button — the credentials path already refuses these.
    if (existing.locked) return { ok: false, reason: "locked" };
    if (existing.is_active === false) return { ok: false, reason: "inactive" };

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        // The provider has verified this address, so a pending email
        // verification is satisfied. Never un-verify an already-verified user.
        email_verified: existing.email_verified ?? new Date(),
        // Only FILL gaps — a user who edited their name keeps it.
        first_name: existing.first_name || first || null,
        last_name: existing.last_name || last || null,
        image: existing.image || input.image || null,
        last_login: new Date(),
        failed_login_attempts: 0,
        oauth_providers: existing.oauth_providers.includes(input.provider)
          ? existing.oauth_providers
          : [...existing.oauth_providers, input.provider],
      },
    });

    // Backfill the photo onto an existing Person that has none, so an OAuth
    // login gives an avatar without touching a photo the user chose.
    if (input.image) {
      await prisma.person.updateMany({
        where: { user_id: existing.id, photo_url: null },
        data: { photo_url: input.image },
      });
    }

    return { ok: true, userId: existing.id, created: false };
  }

  const created = await prisma.user.create({
    data: {
      email,
      // No password: this account authenticates through the provider.
      password_hash: null,
      first_name: first || null,
      last_name: last || null,
      image: input.image ?? null,
      role: "MEMBER",
      // OAuth emails are provider-verified, so the email gate is already met.
      email_verified: new Date(),
      last_login: new Date(),
      oauth_providers: [input.provider],
      /*
        ── ⚠⚠ ACCEPTANCE, IN THE SAME CREATE (`P1-ALL-E384` WS-1b) ────────────

        SCOTT, 2026-09-04: *"yes, everyone needs to accept ToS...fix."*

        ⚠ THIS HOLE IS LATENT, NOT LIVE — it has produced 0 rows only because
        OAuth is wired and OFF until keys are added. That is exactly why it is
        worth fixing now: the day the keys land, every Google and Apple sign-in
        would have created a member with no master agreement, and nobody would
        have noticed because there is no form to be missing a checkbox from.

        ⚠⚠ SAME TRANSACTION AS THE USER, for the same reason as the claim path:
        an OAuth account without an acceptance must not be a state the database
        can reach.

        ⚠ AND THE SAME COPY OBLIGATION APPLIES — see `CLAIM_TERMS_NOTICE`. THE
        SIGN-IN BUTTON MUST CARRY IT before the click. ⚠ REPORTED AT `E384` AND
        NOT DONE HERE: the OAuth buttons are on the login and signup surfaces,
        those buttons are not rendered while the providers are disabled, and
        putting copy under a button nobody can see is not a fix. It has to land
        with the keys, and `check:tos` names this file so the write cannot
        disappear in the meantime.
      */
      tos_accepted_at: new Date(),
      tos_version: USER_TOS_VERSION,
    },
  });

  return { ok: true, userId: created.id, created: true };
}

// ---------------------------------------------------------------------------
// Provider configuration guards.
// ---------------------------------------------------------------------------

/**
 * A provider is only offered when its credentials are actually present.
 *
 * Same discipline as the Resend / Twilio clients (pitfalls.md): read env
 * LAZILY inside a function, never at module load, so a missing key disables a
 * button instead of breaking `next build`'s page-data collection.
 */
export const oauthConfig = {
  google: () =>
    Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  apple: () =>
    Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
};

/** Which social buttons should be live right now. */
export function configuredOAuthProviders(): string[] {
  return Object.entries(oauthConfig)
    .filter(([, isSet]) => isSet())
    .map(([name]) => name);
}
