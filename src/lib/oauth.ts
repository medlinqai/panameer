import { prisma } from "@/lib/prisma";
import { creditInviteForNewUser } from "@/lib/colleague-invite";
import { USER_TOS_VERSION } from "@/lib/tos";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { capitalizeName } from "@/lib/display";

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
      tos_accepted_at: new Date(),
      tos_version: USER_TOS_VERSION,
    },
  });

  await creditInviteForNewUser(created.id, email);
  return { ok: true, userId: created.id, created: true };
}

// ---------------------------------------------------------------------------
// Provider configuration guards.
// ---------------------------------------------------------------------------

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
