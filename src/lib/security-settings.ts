import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateSecret, otpauthUri, verifyTotp } from "@/lib/totp";
import { SettingsError } from "@/lib/settings";
import type { Viewer } from "@/lib/access";

/**
 * Password & Security (J2.4 WS-H / E018).
 *
 * Separate from `settings.ts` because everything here is a CREDENTIAL. The
 * other settings modules move preferences around; these five functions change
 * what it takes to become this person, and mixing the two invites a future
 * change to treat a password write with the ceremony of a checkbox.
 */

async function ownUser(viewer: Viewer) {
  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: {
      id: true,
      email: true,
      password_hash: true,
      twoFactor: true,
      oauth_providers: true,
    },
  });
  if (!user) throw new SettingsError("No account", "NOT_FOUND");
  return user;
}

export async function getSecurity(viewer: Viewer) {
  const user = await ownUser(viewer);
  return {
    email: user.email,
    hasPassword: !!user.password_hash,
    /*
      LinkedIn is deliberately ABSENT rather than shown disconnected — it was
      removed from the product everywhere (PJv2 WS2), and a greyed-out row for
      something we will never offer is a promise, not a status.
    */
    connected: {
      google: user.oauth_providers.includes("google"),
      apple: user.oauth_providers.includes("apple"),
    },
    totp: {
      /** Enrollment STARTED is not enrollment DONE — only `confirmed_at` counts. */
      enabled: !!user.twoFactor?.confirmed_at,
      pending: !!user.twoFactor?.totp_secret && !user.twoFactor?.confirmed_at,
    },
    securityQuestion: user.twoFactor?.question ?? null,
  };
}

/**
 * Change the password.
 *
 * THE CURRENT ONE IS REQUIRED, and that is not a formality: a session left open
 * on a borrowed laptop is the threat this defends against, and a change form
 * that only needs the new value hands the account to whoever is sitting there.
 */
export async function changePassword(
  viewer: Viewer,
  input: { current: string; next: string }
) {
  const user = await ownUser(viewer);
  if (!user.password_hash) {
    throw new SettingsError(
      "This account signs in with Google or Apple, so there's no password to change.",
      "INVALID"
    );
  }
  if (!(await verifyPassword(input.current, user.password_hash))) {
    throw new SettingsError("That isn't your current password.", "INVALID");
  }
  if (input.next.length < 10) {
    throw new SettingsError("Use at least 10 characters.", "INVALID");
  }
  if (input.next === input.current) {
    throw new SettingsError("That's the password you already have.", "INVALID");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: await hashPassword(input.next) },
  });
}

/**
 * Begin TOTP enrollment: mint a secret, return it and the otpauth URI.
 *
 * The secret is stored UNCONFIRMED. Until a valid code proves the authenticator
 * actually holds it, two-step stays off — otherwise a mistyped scan locks
 * somebody out of their own account, which is the classic way to turn a
 * security feature into a support queue.
 */
export async function beginTotp(viewer: Viewer) {
  const user = await ownUser(viewer);
  if (user.twoFactor?.confirmed_at) {
    throw new SettingsError("Two-step verification is already on.", "INVALID");
  }
  const secret = generateSecret();
  await prisma.twoFactorSetting.upsert({
    where: { user_id: user.id },
    update: { totp_secret: secret, confirmed_at: null },
    create: { user_id: user.id, totp_secret: secret },
  });
  return { secret, uri: otpauthUri(secret, user.email) };
}

/** Confirm enrollment with a live code. This is what turns two-step on. */
export async function confirmTotp(viewer: Viewer, code: string) {
  const user = await ownUser(viewer);
  const secret = user.twoFactor?.totp_secret;
  if (!secret) throw new SettingsError("Start the setup first.", "INVALID");
  if (!verifyTotp(secret, code)) {
    throw new SettingsError(
      "That code didn't match. Codes change every 30 seconds — try the current one.",
      "INVALID"
    );
  }
  await prisma.twoFactorSetting.update({
    where: { user_id: user.id },
    data: { confirmed_at: new Date() },
  });
}

/**
 * Turn it off — with a current code, not just a session.
 *
 * Disabling 2FA from a hijacked session would make the feature decorative. The
 * code proves the person asking still holds the second factor.
 */
export async function disableTotp(viewer: Viewer, code: string) {
  const user = await ownUser(viewer);
  const secret = user.twoFactor?.totp_secret;
  if (!secret || !user.twoFactor?.confirmed_at) {
    throw new SettingsError("Two-step verification isn't on.", "INVALID");
  }
  if (!verifyTotp(secret, code)) {
    throw new SettingsError("That code didn't match.", "INVALID");
  }
  await prisma.twoFactorSetting.update({
    where: { user_id: user.id },
    data: { totp_secret: null, confirmed_at: null },
  });
}

/**
 * The security question.
 *
 * THE ANSWER IS HASHED, like a password, because that is what it is — a shared
 * secret that recovers an account. Storing it in the clear would make it a
 * worse password than the password, sitting next to it in the same table.
 */
export async function setSecurityQuestion(
  viewer: Viewer,
  input: { question: string; answer: string }
) {
  const user = await ownUser(viewer);
  if (input.answer.trim().length < 3) {
    throw new SettingsError("That answer is too short to be useful.", "INVALID");
  }
  const data = {
    question: input.question.trim().slice(0, 200),
    // Case- and space-insensitive: nobody recalls the capitalisation they used
    // two years ago, and demanding it turns recovery into a second lockout.
    answer_hash: await hashPassword(input.answer.trim().toLowerCase()),
  };
  await prisma.twoFactorSetting.upsert({
    where: { user_id: user.id },
    update: data,
    create: { user_id: user.id, ...data },
  });
}
