import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashToken, appBaseUrl } from "@/lib/verification";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/resend";
import { passwordResetTemplate } from "@/lib/email/templates/password-reset";

/**
 * ── ⚠⚠ FORGOT PASSWORD (`P1-ALL-E528` Part B) ──────────────────────────────
 *
 * ⚠ IT REUSES `VerificationToken`. No new model, no new column — one enum value
 * (`PASSWORD_RESET`). The model already stores a unique SHA-256 `token_hash`, an
 * `expires_at`, a `consumed_at` and the user, which is the whole shape the brief
 * specifies, and every query in `verification.ts` is already scoped by `type`.
 *
 * ⚠⚠ THE RAW TOKEN LIVES IN THE EMAILED LINK AND NOWHERE ELSE — the discipline
 * `ColleagueInvite`, `CoordinatorInvite` and `verify-email` all use.
 */

/**
 * ⚠⚠ ONE HOUR, AND IT IS THE SHORTEST OF THE THREE TOKEN TYPES ON PURPOSE.
 * `EMAIL` is 24h and `SIGNIN` is 5 minutes. ⚠ This one is a CREDENTIAL: it can
 * take over an account. An hour survives slow delivery and a person going to
 * find the mail, and is short enough that a forwarded or archived copy is
 * usually already dead. ⚠ The email states this number; `check:email` asserts it.
 */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * ⚠ PER ADDRESS, DURABLE (counted in the database).
 *
 * ⚠⚠ THREE, NOT TEN. `INVITE_LIMIT_PER_HOUR` is 10/hour, but an invitation is
 * sent BY a signed-in member TO someone else; this is an unauthenticated public
 * form and the mail lands on somebody who did not ask for it. Three is enough
 * for "it went to spam, try again" and not enough to be a nuisance.
 */
export const RESET_LIMIT_PER_EMAIL_PER_HOUR = 3;

/**
 * ⚠ PER IP, BEST EFFORT ONLY — and that is a REPORTED LIMITATION, not a claim.
 *
 * ⚠⚠ NOTHING IN THIS APP STORES A REQUEST IP, so a durable per-IP counter would
 * need a table, which is schema this brief does not authorise. This map lives in
 * ONE server instance's memory: it stops a burst from one client, and it does
 * not survive a redeploy or span instances. ⚠ A real per-IP limit is Scott's
 * call and needs its own model.
 */
export const RESET_LIMIT_PER_IP_PER_HOUR = 10;
const ipHits = new Map<string, number[]>();

function ipAllowed(ip: string | null): boolean {
  if (!ip) return true; // ⚠ no address to attribute — the per-EMAIL limit still applies
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < hour);
  if (hits.length >= RESET_LIMIT_PER_IP_PER_HOUR) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  /* ⚠ Bound the map so a long-lived instance cannot grow it without limit. */
  if (ipHits.size > 5_000) for (const k of [...ipHits.keys()].slice(0, 1_000)) ipHits.delete(k);
  return true;
}

/**
 * Mint a reset token and email it.
 *
 * ⚠⚠ THE RETURN IS THE SAME WHATEVER HAPPENS. The caller must render one
 * sentence for every outcome — *"If that address has an account, a reset link is
 * on its way."* ⚠ Different answers turn a public page into a membership
 * oracle. ⚠ `E525` opened that door for a SIGNED-IN member, rate-limited; this
 * page is public and must not.
 *
 * ⚠ `devLink` is returned ONLY outside production, and only so a walk on
 * localhost can follow the link without a mailbox. It is never rendered to a
 * user by the route.
 */
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
  /*
    ⚠⚠ NO ACCOUNT → NOTHING HAPPENS, SILENTLY. Not an error, not a different
    shape, not a different timing branch worth measuring.
    ⚠ NO `password_hash` → an OAuth-only account (`brief_Q` made the column
    nullable). It gets the same silence: there is no password to reset, and the
    brief reserves the "you sign in with Google" mail for Scott to rule on.
    ⚠ NOTE: OAuth is not switched on today (no keys), so this branch is
    theoretical — but the column is nullable and the check is one line.
  */
  if (!user?.password_hash) return {};

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.verificationToken.count({
    where: { user_id: user.id, type: "PASSWORD_RESET", created_at: { gte: since } },
  });
  if (recent >= RESET_LIMIT_PER_EMAIL_PER_HOUR) return {};

  const raw = randomBytes(32).toString("base64url");
  const tx = await prisma.$transaction([
    /*
      ⚠⚠ SUPERSEDED TOKENS ARE CONSUMED, NOT DELETED — AND THE PROOF RUN IS WHY.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
          prisma.verificationToken.deleteMany({
            where: { user_id: user.id, type: "PASSWORD_RESET", consumed_at: null },
          }),
      ⚠⚠ THAT DELETE ERASED THE RATE LIMIT'S OWN EVIDENCE. The limit counts rows
      created in the last hour; deleting the previous unconsumed row kept that
      count at 1–2 forever, so the 4th, 5th and 6th request in a minute all still
      issued a link. ⚠ MEASURED on the walk, not reasoned about — it looked
      correct in review.
      ⚠ Consuming keeps BOTH properties: only the newest link can be redeemed
      (a consumed token is refused), and the hour's history survives to be
      counted. `issueSignInToken` deletes because nothing counts its rows.
    */
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
  /* ⚠ The transaction returns [updateMany, create]; the second is the new token,
     whose id the receipt records as its subject (`P2-J3-E522` Part A). */
  const token = tx[1];

  const base = appBaseUrl(opts.origin);
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(raw)}`;
  const mail = passwordResetTemplate({
    firstName: user.first_name ?? "",
    resetUrl,
    logoUrl: `${base}/brand/panameer-lockup-ink.png`,
    expiresInHours: Math.round(RESET_TOKEN_TTL_MS / (60 * 60 * 1000)),
  });
  /*
    ⚠⚠ NO `category` — this is transactional. It is still blocked by a
    suppress-everything row, and THAT IS REPORTED, NOT DECIDED (`E386` checks
    suppression inside the transport so a sender cannot forget). ⚠ The brief asks
    whether a reset should bypass suppression; chat's reading and mine is YES —
    somebody who unsubscribed from notifications has not given up the ability to
    get back into their account — but bypassing is a change to the TRANSPORT and
    it is Scott's call.
  */
  /* ⚠ SUBJECT IS THE TOKEN, AND THE TOKEN IS CONSUMED-NOT-DELETED (`E528B`), so
     the receipt still points at a real row after the reset is used. ⚠⚠ THAT IS
     ONE OF THE THREE "LOSSY" SENDERS THIS TABLE EXISTS FOR — a reset that never
     arrives IS an account lockout. */
  await sendEmail({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    template: "password-reset",
    subjectType: "VerificationToken",
    subjectId: token.id,
    userId: user.id,
  });

  return process.env.NODE_ENV === "production" ? {} : { devLink: resetUrl };
}

export type ResetOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" | "weak" };

/**
 * Consume a reset token and set the new password.
 *
 * ⚠⚠ A SUCCESSFUL RESET CLEARS THE LOCKOUT — `locked`, `locked_until` and
 * `failed_login_attempts` all go. ⚠ The person most likely to reset a password
 * is the person who just failed five times; a reset that leaves them locked out
 * is theatre.
 *
 * ⚠ SINGLE USE: the token is consumed in the SAME transaction as the password
 * write, so a second click cannot land on a half-applied reset.
 */
export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string
): Promise<ResetOutcome> {
  /* ⚠ The same floor the sign-up paths enforce (`onboarding.ts:522`). */
  if (!newPassword || newPassword.length < 8) return { ok: false, reason: "weak" };
  if (!rawToken) return { ok: false, reason: "invalid" };

  const record = await prisma.verificationToken.findUnique({
    where: { token_hash: hashToken(rawToken) },
    select: { id: true, user_id: true, type: true, expires_at: true, consumed_at: true },
  });
  /* ⚠ A token of another TYPE is not a reset token. Scoping every lookup by
     `type` is what makes sharing the model safe. */
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
