import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateSecret, otpauthUri, verifyTotp } from "@/lib/totp";
import { SettingsError } from "@/lib/settings";
import type { Viewer } from "@/lib/access";

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
  try {
    const person = await prisma.person.findFirst({
      where: { user_id: user.id },
      select: { id: true },
    });
    if (person) {
      const { notify } = await import("@/lib/notifications");
      await notify({
        event: "account.credential_changed",
        personId: person.id,
        vars: { credential: "password" },
      });
    }
  } catch (e) {
    console.error("[security] could not record a credential-change notification:", e);
  }
}

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
