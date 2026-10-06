import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";

export function unsubscribeToken(email: string, category: string | null): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("unsubscribeToken: NEXTAUTH_SECRET is not set");
  const payload = `${normalizeEmail(email)}:${category ?? "*"}`;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** CONSTANT-TIME COMPARISON. A `===` on a signature leaks its prefix through */
export function verifyUnsubscribeToken(
  email: string,
  category: string | null,
  token: string
): boolean {
  try {
    const expected = Buffer.from(unsubscribeToken(email, category));
    const given = Buffer.from(token);
    // compared first — and a wrong length is already a rejection.
    if (expected.length !== given.length) return false;
    return timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/** IS THIS ADDRESS SUPPRESSED FOR THIS CATEGORY. */
export async function isSuppressed(
  email: string,
  category?: string | null,
  // THE ONE EXEMPTION, NAMED PART A)
  bypassFor?: "password-reset"
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const row = await prisma.emailSuppression.findFirst({
    where: {
      email: normalized,
      OR: [{ category: null }, ...(category ? [{ category }] : [])],
    },
    select: { id: true, reason: true },
  });
  if (!row) return false;
  if (bypassFor === "password-reset" && OVERRIDABLE_REASONS.includes(row.reason)) {
    console.log(`[mail] suppression BYPASSED for password-reset (${row.reason}) -> ${normalized}`);
    return false;
  }
  return true;
}

/** The reasons a password reset may override. `bounce` IS NOT ONE. */
export const OVERRIDABLE_REASONS = ["unsubscribe_link", "complaint"];

/** Record a suppression. IDEMPOTENT — clicking unsubscribe twice is not an */
export async function suppress(
  email: string,
  category: string | null,
  reason: string
): Promise<void> {
  const normalized = normalizeEmail(email);
  // NOT AN `upsert`, AND THE REASON IS A PRISMA CONSTRAINT RATHER THAN A
  const existing = await prisma.emailSuppression.findFirst({
    where: { email: normalized, category },
    select: { id: true },
  });
  if (existing) return;
  try {
    await prisma.emailSuppression.create({ data: { email: normalized, category, reason } });
  } catch (e) {
    // P2002 IS THE UNIQUE VIOLATION AND IS THE ONLY ONE SWALLOWED. Anything
    const code = (e as { code?: string })?.code;
    if (code !== "P2002") throw e;
  }
}

/** THE ADDRESS IS MASKED ON THE PAGE — `s••••@straterp.com`. */
export function maskEmail(email: string): string {
  const [local, domain] = normalizeEmail(email).split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 1);
  return `${head}${"•".repeat(Math.max(3, Math.min(local.length - 1, 6)))}@${domain}`;
}

/** The link that goes in an email footer. */
export function unsubscribeUrl(baseUrl: string, email: string, category: string | null): string {
  const q = new URLSearchParams({
    e: normalizeEmail(email),
    t: unsubscribeToken(email, category),
  });
  if (category) q.set("c", category);
  return `${baseUrl.replace(/\/$/, "")}/unsubscribe?${q}`;
}
