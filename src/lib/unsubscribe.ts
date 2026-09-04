import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";

/**
 * UNSUBSCRIBE — a signed token, and a suppression list (`P1-ALL-E386`).
 *
 * ── ⚠⚠ WHY THIS IS URGENT RATHER THAN TIDY ────────────────────────────────
 *
 * `E371` turned the key on, so seven senders now deliver for real — and every
 * one of those emails carried a BROKEN unsubscribe link. `shell.ts:117` pointed
 * at `/settings/notifications`, and `route-access.ts:59` gates `/settings`
 * behind `canProvideServices`. So a provider could unsubscribe, a BUYER WAS
 * BOUNCED, a SIGNED-OUT recipient was bounced, and an address with no account
 * had no page at all.
 *
 * ⚠ A dead unsubscribe in a drawer is a defect. A dead unsubscribe in a
 * DELIVERED email is how a sending domain gets blocked — and
 * `mail.panameer.com` has no reputation yet to spend.
 *
 * ⚠ `shell.ts:101` argued a settings page is *"a truer 'unsubscribe' than a
 * link that silently does nothing."* HALF RIGHT — true for a signed-in
 * provider, false for everyone else, and it is the everyone-else case that is
 * legally load-bearing. That comment is quoted in `shell.ts`, not deleted.
 *
 * ── ⚠⚠ THE SIGNING MECHANISM, AND WHY IT IS THIS ONE ──────────────────────
 *
 * `HMAC-SHA256` over `email:category`, keyed with `NEXTAUTH_SECRET`, compared
 * with `timingSafeEqual`. ⚠ NOT A SECOND MECHANISM: `createHmac` and
 * `timingSafeEqual` are already the app's signing primitives in `lib/totp.ts`,
 * and `NEXTAUTH_SECRET` is already a required env var.
 *
 * ⚠ THE APP'S OTHER TOKEN PATTERN — `randomBytes` + a stored SHA-256 hash, used
 * by project-validation, coordinator and phone-verification — IS A TOKEN
 * **STORE**, NOT A SIGNATURE. It cannot CARRY a payload: the payload lives in a
 * database row, so it would need ONE ROW PER EMAIL SENT, for a footer link most
 * recipients never click. That is why signing is right here and storing is not.
 *
 * ⚠⚠ AND IT IS SIGNED RATHER THAN A RAW ID BECAUSE A `Person` UUID IN A URL IS
 * AN UNSUBSCRIBE API FOR THE WHOLE PLATFORM — anybody could enumerate ids and
 * silence every member.
 *
 * ⚠⚠ NO EXPIRY, DELIBERATELY. An unsubscribe must work in a year-old email.
 * This is the one place a long-lived token is the correct answer: the harm a
 * stolen unsubscribe token can do is to stop mail the holder's own address was
 * receiving, which is the thing they were being offered anyway.
 */

/** ⚠ `null` category = every category. */
export function unsubscribeToken(email: string, category: string | null): string {
  const secret = process.env.NEXTAUTH_SECRET;
  /* ⚠ THROWS RATHER THAN SIGNING WITH AN EMPTY KEY. An HMAC keyed on "" is
     forgeable by anyone who notices, and it would look identical in a URL. */
  if (!secret) throw new Error("unsubscribeToken: NEXTAUTH_SECRET is not set");
  const payload = `${normalizeEmail(email)}:${category ?? "*"}`;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * ⚠ CONSTANT-TIME COMPARISON. A `===` on a signature leaks its prefix through
 * timing, which is the standard way these get forged one byte at a time.
 */
export function verifyUnsubscribeToken(
  email: string,
  category: string | null,
  token: string
): boolean {
  try {
    const expected = Buffer.from(unsubscribeToken(email, category));
    const given = Buffer.from(token);
    /* ⚠ `timingSafeEqual` THROWS ON A LENGTH MISMATCH, so the lengths are
       compared first — and a wrong length is already a rejection. */
    if (expected.length !== given.length) return false;
    return timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/**
 * ⚠⚠ IS THIS ADDRESS SUPPRESSED FOR THIS CATEGORY.
 *
 * Two ways to be suppressed: a row for the exact category, or a row with a NULL
 * category, which means everything.
 */
export async function isSuppressed(email: string, category?: string | null): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const row = await prisma.emailSuppression.findFirst({
    where: {
      email: normalized,
      OR: [{ category: null }, ...(category ? [{ category }] : [])],
    },
    select: { id: true },
  });
  return Boolean(row);
}

/**
 * Record a suppression. ⚠ IDEMPOTENT — clicking unsubscribe twice is not an
 * error, and the second click must not 500 on a unique violation.
 *
 * ⚠⚠ AND IT NEVER DELETES. There is no `unsuppress()` in this module. Somebody
 * who wants mail again re-opts-in through the settings screen, which writes
 * `NotificationPreference` — the suppression row stays as the record that they
 * once said no. `check:unsubscribe` fails the build if any code deletes one.
 */
export async function suppress(
  email: string,
  category: string | null,
  reason: string
): Promise<void> {
  const normalized = normalizeEmail(email);
  /*
    ⚠⚠ NOT AN `upsert`, AND THE REASON IS A PRISMA CONSTRAINT RATHER THAN A
    PREFERENCE: a compound unique containing a NULLABLE column cannot be used in
    a `findUnique`/`upsert` `where` when that column is null — and `category:
    null` ("everything") is the most important case here. Measured: it is a
    TS2322 at the `where`, not a runtime surprise.

    ⚠ SO IT IS FIND-THEN-CREATE, WITH THE RACE CAUGHT. Two simultaneous clicks
    on the same link would both pass the find and one would violate the unique;
    swallowing THAT specific error is correct, because the row it collided with
    is the row we wanted.
  */
  const existing = await prisma.emailSuppression.findFirst({
    where: { email: normalized, category },
    select: { id: true },
  });
  if (existing) return;
  try {
    await prisma.emailSuppression.create({ data: { email: normalized, category, reason } });
  } catch (e) {
    /* ⚠ P2002 IS THE UNIQUE VIOLATION AND IS THE ONLY ONE SWALLOWED. Anything
       else is a real failure and must surface. */
    const code = (e as { code?: string })?.code;
    if (code !== "P2002") throw e;
  }
}

/**
 * ⚠ THE ADDRESS IS MASKED ON THE PAGE — `s••••@straterp.com`.
 *
 * The unsubscribe URL may be forwarded, quoted in a reply, or pasted into a
 * ticket. Printing the full address turns a link somebody forwarded into a
 * disclosure of who was on the list.
 */
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
