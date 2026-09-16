import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { colleagueInviteTemplate } from "@/lib/email/templates/colleague-invite";

/**
 * INVITE A COLLEAGUE (`P2-J3-E493`).
 *
 * > **SCOTT, 2026-09-13:** *"can we add an 'Invite a Colleague' page… requesting
 * > the person being emailed to connect to panameer?"*
 *
 * ⚠⚠ THIS IS NOT A ROSTER INVITE AND IT DELIBERATELY REUSES NONE OF ONE.
 * `CoordinatorInvite`'s accept path writes `coordinator_person_id` onto the
 * invitee's ProviderProfile and refuses anyone who has no ProviderProfile. A
 * colleague may be a buyer, a requester, or nobody yet, and the invitation
 * confers NO relationship — it is "come and look at this".
 *
 * ⚠ THE ASK IS DIFFERENT FROM A RECOMMENDATION AND READS DIFFERENTLY. Request
 * Recommendations asks somebody to VOUCH FOR YOU; this asks them to JOIN. The
 * copy is not the recommendation copy with words swapped.
 */

/** How long an invitation stays good for. */
export const INVITE_TTL_DAYS = 30;

/*
  ── ⚠⚠ THE RATE LIMIT (`E493`) ─────────────────────────────────────────────

  ⚠ A FORM THAT EMAILS ARBITRARY ADDRESSES ON DEMAND IS THE ONE THING ON THIS
  PAGE THAT CAN BE ABUSED, and it is the reason this exists.

  ⚠ IT IS COUNTED IN THE DATABASE, not held in memory: an in-process counter
  resets on every deploy and is per-instance, which on serverless means no limit
  at all. `@@index([inviter_person_id, created_at])` exists for this query.

  ⚠ TWO WINDOWS, because they stop different things: the hourly cap stops a
  burst, the daily cap stops a slow grind that would sit under it all day.
  ⚠⚠ `/recommendations` HAS NO LIMIT AND IS NOT TOUCHED HERE — that gap is
  `E521` and sweeping it into this brief would put one change behind another's
  review.
*/
export const INVITE_LIMIT_PER_HOUR = 10;
export const INVITE_LIMIT_PER_DAY = 40;

export type InviteResult =
  | { ok: true; sent: boolean; devLink?: string }
  | { ok: false; reason: "rate_limited" | "already_member" | "already_invited" | "invalid"; retryAfterMs?: number };

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Remaining allowance, so the UI can warn before the refusal. */
export async function inviteAllowance(inviterPersonId: string) {
  const now = Date.now();
  const [lastHour, lastDay] = await Promise.all([
    prisma.colleagueInvite.count({
      where: { inviter_person_id: inviterPersonId, created_at: { gte: new Date(now - 3_600_000) } },
    }),
    prisma.colleagueInvite.count({
      where: { inviter_person_id: inviterPersonId, created_at: { gte: new Date(now - 86_400_000) } },
    }),
  ]);
  return {
    hourRemaining: Math.max(0, INVITE_LIMIT_PER_HOUR - lastHour),
    dayRemaining: Math.max(0, INVITE_LIMIT_PER_DAY - lastDay),
  };
}

/**
 * Send one colleague invitation.
 *
 * ⚠ OWNER-SCOPED BY CONSTRUCTION — `inviterPersonId` is resolved from the
 * session by the caller and never accepted from client input.
 */
export async function inviteColleague(input: {
  inviterPersonId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  message?: string | null;
  origin: string;
}): Promise<InviteResult> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) return { ok: false, reason: "invalid" };

  /* ⚠ THE LIMIT IS CHECKED BEFORE ANYTHING IS WRITTEN OR SENT. */
  const allowance = await inviteAllowance(input.inviterPersonId);
  if (allowance.hourRemaining <= 0 || allowance.dayRemaining <= 0) {
    return { ok: false, reason: "rate_limited", retryAfterMs: 3_600_000 };
  }

  /*
    ⚠ INVITING SOMEBODY WHO IS ALREADY HERE READS AS A PRODUCT THAT DOES NOT
    KNOW ITS OWN USERS — the same reasoning `recommendation-request`'s `invite`
    footer already applies. It is not an error; it is a different answer.
  */
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, reason: "already_member" };

  /* ⚠ ONE LIVE INVITATION PER ADDRESS PER INVITER. Re-inviting the same person
     repeatedly is the abuse case the rate limit above cannot see on its own. */
  const pending = await prisma.colleagueInvite.findFirst({
    where: {
      inviter_person_id: input.inviterPersonId,
      invitee_email: email,
      status: "PENDING",
      expires_at: { gt: new Date() },
    },
    select: { id: true },
  });
  if (pending) return { ok: false, reason: "already_invited" };

  /* ⚠ THE RAW TOKEN LIVES ONLY IN THE EMAILED LINK. The row keeps its SHA-256,
     the same discipline `CoordinatorInvite` uses. */
  const raw = randomBytes(32).toString("hex");
  const row = await prisma.colleagueInvite.create({
    data: {
      inviter_person_id: input.inviterPersonId,
      invitee_email: email,
      invitee_first_name: input.firstName?.trim() || null,
      invitee_last_name: input.lastName?.trim() || null,
      message: input.message?.trim() || null,
      token_hash: hash(raw),
      expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    },
    select: { id: true },
  });

  const inviter = await prisma.person.findUnique({
    where: { id: input.inviterPersonId },
    select: { first_name: true, last_name: true },
  });
  const inviterName =
    `${inviter?.first_name ?? ""} ${inviter?.last_name ?? ""}`.trim() || "A colleague";

  const url = `${input.origin}/invite/colleague/${raw}`;
  const { subject, html, text } = colleagueInviteTemplate({
    inviterName,
    inviteeName: input.firstName?.trim() || null,
    message: input.message?.trim() || null,
    joinUrl: url,
  });

  /*
    ⚠ SUPPRESSION IS NOT CHECKED HERE, AND THAT IS CORRECT. `E386` checks
    `EmailSuppression` INSIDE `sendEmail` — in the transport — precisely so a new
    sender cannot forget. Re-checking it here would be a second copy of a rule
    that already cannot be bypassed.
    ⚠ NO RESEND KEY = NO SEND, and the link comes back instead — the same dev
    affordance verify-email and recommendations use, so the loop stays walkable.
  */
  try {
    await sendEmail({ to: email, subject, html, text });
    return { ok: true, sent: true };
  } catch {
    void row;
    return { ok: true, sent: false, devLink: url };
  }
}

/** Look one up by its raw token, for the accept surface. */
export async function lookupColleagueInvite(rawToken: string) {
  const row = await prisma.colleagueInvite.findUnique({
    where: { token_hash: hash(rawToken) },
    select: {
      id: true,
      invitee_email: true,
      invitee_first_name: true,
      message: true,
      status: true,
      expires_at: true,
      inviter: { select: { first_name: true, last_name: true } },
    },
  });
  if (!row) return { ok: false as const, reason: "invalid" as const };
  if (row.status === "REVOKED") return { ok: false as const, reason: "revoked" as const };
  if (row.status === "ACCEPTED") return { ok: false as const, reason: "accepted" as const };
  if (row.expires_at < new Date()) return { ok: false as const, reason: "expired" as const };
  return {
    ok: true as const,
    email: row.invitee_email,
    firstName: row.invitee_first_name,
    message: row.message,
    inviterName:
      `${row.inviter?.first_name ?? ""} ${row.inviter?.last_name ?? ""}`.trim() || "A colleague",
  };
}
