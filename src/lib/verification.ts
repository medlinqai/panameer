import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { verifyEmailTemplate } from "@/lib/email/templates/verify-email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESEND_THROTTLE_MS = 60 * 1000; // 1 per minute per user

/** SHA-256 hex of a raw token — we store only the hash (shared, brief_I). */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Absolute base URL for links in emails (the app host in prod). Shared. */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3100"
  );
}

/**
 * Issue a fresh email-verification token for a user and send the email.
 * Invalidates any prior unconsumed EMAIL tokens so only the newest link works.
 * `throttle` guards the resend path (one per minute); the initial send on
 * account creation passes throttle:false.
 *
 * Returns `{ sent, devLink }`. In dev without RESEND_API_KEY we skip the real
 * send and return the link so the round-trip is still testable locally.
 */
export async function issueEmailVerification(
  userId: string,
  opts: { throttle?: boolean } = {}
): Promise<
  | { ok: true; sent: boolean; devLink?: string }
  | { ok: false; reason: "throttled" | "not_found" | "already_verified"; retryAfterMs?: number }
> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, reason: "not_found" };
  if (user.email_verified) return { ok: false, reason: "already_verified" };

  if (opts.throttle) {
    const recent = await prisma.verificationToken.findFirst({
      where: { user_id: userId, type: "EMAIL" },
      orderBy: { created_at: "desc" },
    });
    if (recent) {
      const age = Date.now() - recent.created_at.getTime();
      if (age < RESEND_THROTTLE_MS) {
        return { ok: false, reason: "throttled", retryAfterMs: RESEND_THROTTLE_MS - age };
      }
    }
  }

  // Only the newest link should be valid.
  await prisma.verificationToken.deleteMany({
    where: { user_id: userId, type: "EMAIL", consumed_at: null },
  });

  const raw = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({
    data: {
      user_id: userId,
      token_hash: hashToken(raw),
      type: "EMAIL",
      expires_at: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const verifyUrl = `${appBaseUrl()}/verify-email?token=${raw}`;
  const { subject, html, text } = verifyEmailTemplate({
    firstName: user.first_name ?? "",
    verifyUrl,
  });

  // Real send when configured (prod/Vercel). Dev fallback: log the link so the
  // flow is testable without a Resend key.
  if (process.env.RESEND_API_KEY) {
    await sendEmail({ to: user.email, subject, html, text });
    return { ok: true, sent: true };
  }

  console.warn(
    `[verification] RESEND_API_KEY not set — dev fallback. Verify link for ${user.email}:\n${verifyUrl}`
  );
  return { ok: true, sent: false, devLink: verifyUrl };
}

/**
 * Verify a raw token from the email link. Idempotent: a token consumed after
 * the user is already verified still reports success.
 */
export async function consumeEmailVerification(
  rawToken: string
): Promise<{ ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" }> {
  if (!rawToken) return { ok: false, reason: "invalid" };

  const record = await prisma.verificationToken.findUnique({
    where: { token_hash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!record) return { ok: false, reason: "invalid" };

  // Already consumed but the user is verified → treat as success (link clicked
  // twice, or opened in two tabs).
  if (record.consumed_at) {
    if (record.user.email_verified) return { ok: true, userId: record.user_id };
    return { ok: false, reason: "invalid" };
  }

  if (record.expires_at.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumed_at: new Date() },
    }),
    prisma.user.update({
      where: { id: record.user_id },
      data: { email_verified: record.user.email_verified ?? new Date() },
    }),
  ]);

  return { ok: true, userId: record.user_id };
}
