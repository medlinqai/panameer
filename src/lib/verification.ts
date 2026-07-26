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

/**
 * Absolute base URL for links in emails. Shared.
 *
 * `origin` — the origin of the request that triggered the send — takes
 * precedence (brief_S / E022). Without it a walk on `localhost:3100` receives a
 * link pointing at whatever `NEXT_PUBLIC_APP_URL` happens to hold (the Vercel
 * URL), and clicking it lands on a DIFFERENT host with no session, which is
 * exactly the "bounced to /login" symptom Scott hit. Env values remain the
 * fallback for contexts with no request (cron, scripts).
 */
export function appBaseUrl(origin?: string | null): string {
  if (origin) return origin.replace(/\/+$/, "");
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
  opts: { throttle?: boolean; origin?: string | null } = {}
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

  const base = appBaseUrl(opts.origin);
  const verifyUrl = `${base}/verify-email?token=${raw}`;
  const { subject, html, text } = verifyEmailTemplate({
    firstName: user.first_name ?? "",
    verifyUrl,
    // Absolute — email clients can't resolve app-relative paths (E006).
    logoUrl: `${base}/brand/panameer-logo-transparent.png`,
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
    // Active-on-verify (brief_K): a provider's account goes PENDING → ACTIVE the
    // moment their email is verified. No-op for users without a provider profile.
    prisma.providerProfile.updateMany({
      where: { person: { user_id: record.user_id }, status: "PENDING" },
      data: { status: "ACTIVE" },
    }),
  ]);

  return { ok: true, userId: record.user_id };
}

// ---------------------------------------------------------------------------
// Sign-in handoff (brief_S / E022)
// ---------------------------------------------------------------------------

/** Short window — this token exists only to bridge one redirect. */
const SIGNIN_TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * Mint a SINGLE-USE token that can establish a session (E022).
 *
 * Clicking the emailed verify link has to leave the provider signed in — a GET
 * page can't create a NextAuth session by itself, so the verified page hands
 * this token to the `verify-token` credentials provider, which exchanges it for
 * a real session.
 *
 * Safe because it is only ever minted AFTER an email-verification token has
 * been validated, it is stored as a SHA-256 hash like every other token here,
 * it expires in five minutes, and it is consumed on first use.
 */
export async function issueSignInToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("base64url");

  await prisma.$transaction([
    // Only the newest handoff token is ever valid.
    prisma.verificationToken.deleteMany({
      where: { user_id: userId, type: "SIGNIN", consumed_at: null },
    }),
    prisma.verificationToken.create({
      data: {
        user_id: userId,
        token_hash: hashToken(raw),
        type: "SIGNIN",
        expires_at: new Date(Date.now() + SIGNIN_TOKEN_TTL_MS),
      },
    }),
  ]);

  return raw;
}

/**
 * Exchange a sign-in token for the user it belongs to, consuming it.
 * Returns null for anything invalid, expired, already used, or belonging to a
 * locked/deactivated account — the same fail-closed posture as `authorize`.
 */
export async function consumeSignInToken(
  rawToken: string
): Promise<{ id: string } | null> {
  if (!rawToken) return null;

  const record = await prisma.verificationToken.findUnique({
    where: { token_hash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!record || record.type !== "SIGNIN") return null;
  if (record.consumed_at) return null;
  if (record.expires_at.getTime() < Date.now()) return null;
  if (record.user.locked || record.user.is_active === false) return null;

  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { consumed_at: new Date() },
  });

  return { id: record.user_id };
}
