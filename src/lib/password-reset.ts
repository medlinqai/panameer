import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashToken, appBaseUrl } from "@/lib/verification";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/resend";
import { passwordResetTemplate } from "@/lib/email/templates/password-reset";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const RESET_LIMIT_PER_EMAIL_PER_HOUR = 3;

export const RESET_LIMIT_PER_IP_PER_HOUR = 10;
const ipHits = new Map<string, number[]>();

function ipAllowed(ip: string | null): boolean {
  if (!ip) return true; 
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < hour);
  if (hits.length >= RESET_LIMIT_PER_IP_PER_HOUR) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5_000) for (const k of [...ipHits.keys()].slice(0, 1_000)) ipHits.delete(k);
  return true;
}

export async function requestPasswordReset(
  rawEmail: string,
  opts: { origin?: string | null; ip?: string | null } = {}
): Promise<{ devLink?: string }> {
  const email = normalizeEmail(rawEmail);
  if (!email || !ipAllowed(opts.ip ?? null)) return {};

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password_hash: true, first_name: true },
  });
  if (!user?.password_hash) return {};

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.verificationToken.count({
    where: { user_id: user.id, type: "PASSWORD_RESET", created_at: { gte: since } },
  });
  if (recent >= RESET_LIMIT_PER_EMAIL_PER_HOUR) return {};

  const raw = randomBytes(32).toString("base64url");
  const tx = await prisma.$transaction([
    prisma.verificationToken.updateMany({
      where: { user_id: user.id, type: "PASSWORD_RESET", consumed_at: null },
      data: { consumed_at: new Date() },
    }),
    prisma.verificationToken.create({
      data: {
        user_id: user.id,
        token_hash: hashToken(raw),
        type: "PASSWORD_RESET",
        expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);
  const token = tx[1];

  const base = appBaseUrl(opts.origin);
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(raw)}`;
  const mail = passwordResetTemplate({
    firstName: user.first_name ?? "",
    resetUrl,
    logoUrl: `${base}/brand/panameer-lockup-ink.png`,
    expiresInHours: Math.round(RESET_TOKEN_TTL_MS / (60 * 60 * 1000)),
  });
  // NO `category` — this is transactional. It is still blocked by a
  // SUBJECT IS THE TOKEN, AND THE TOKEN IS CONSUMED-NOT-DELETED (`E528B`), so
  await sendEmail({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    template: "password-reset",
    // THE EXEMPTION. Scott ruled it 2026-09-17: a reset is mail the person
    bypassSuppressionFor: "password-reset",
    subjectType: "VerificationToken",
    subjectId: token.id,
    userId: user.id,
  });

  return process.env.NODE_ENV === "production" ? {} : { devLink: resetUrl };
}

export type ResetOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" | "weak" };

/** Consume a reset token and set the new password. */
export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string
): Promise<ResetOutcome> {
  /* The same floor the sign-up paths enforce (`onboarding.ts:522`). */
  if (!newPassword || newPassword.length < 8) return { ok: false, reason: "weak" };
  if (!rawToken) return { ok: false, reason: "invalid" };

  const record = await prisma.verificationToken.findUnique({
    where: { token_hash: hashToken(rawToken) },
    select: { id: true, user_id: true, type: true, expires_at: true, consumed_at: true },
  });
  // A token of another TYPE is not a reset token. Scoping every lookup by
  if (!record || record.type !== "PASSWORD_RESET") return { ok: false, reason: "invalid" };
  if (record.consumed_at) return { ok: false, reason: "used" };
  if (record.expires_at.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const password_hash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.user_id },
      data: {
        password_hash,
        locked: false,
        locked_until: null,
        failed_login_attempts: 0,
      },
    }),
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumed_at: new Date() },
    }),
  ]);
  return { ok: true };
}
