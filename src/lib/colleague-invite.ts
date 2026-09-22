import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { colleagueInviteTemplate } from "@/lib/email/templates/colleague-invite";
import { memberByEmail, type MemberWithRelation } from "@/lib/connections";
import type { Viewer } from "@/lib/access";

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

/**
 * ⚠⚠ "ALREADY A MEMBER" IS A SUCCESS WITH A DIFFERENT PAYLOAD (`P2-J3-E525`).
 *
 * SCOTT, 2026-09-15: *"I put the email in and it exists...show the card for that
 * email and the CONNECT or MESSAGE buttons."*
 *
 * ⚠ IT IS NOT IN THE REFUSAL UNION ANY MORE, and that is the whole change: the
 * comment below said *"It is not an error; it is a different answer"* while the
 * code returned `ok: false` and the route painted it red. ⚠⚠ THE OTHER THREE
 * REFUSALS ARE STILL ERRORS AND STAY WHERE THEY ARE.
 *
 * ⚠ `already_member` SURVIVES AS A REFUSAL FOR EXACTLY ONE CASE — an address
 * whose `User` has no `Person`, so there is no card to draw. Rare, but a blank
 * card would be worse than the old sentence.
 */
export type InviteResult =
  | { ok: true; outcome: "sent"; sent: boolean; devLink?: string }
  | { ok: true; outcome: "already_member"; member: MemberWithRelation }
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
  /** ⚠ The session viewer, so the member card below carries YOUR relation to
      them. Owner-scoped like `inviterPersonId` — never from client input. */
  viewer: Viewer;
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

    ⚠⚠ `E525` — AND NOW THE CODE DOES WHAT THE COMMENT SAYS. This lookup used to
    be `select: { id: true }`, which is the tell: it was written to answer *"does
    a row exist"* when the useful question is *"who is it"*. It found the person
    and threw them away, and the route turned that into a 409 painted red.

    ⚠ NO `ColleagueInvite` ROW IS WRITTEN ON THIS PATH, and that part was always
    right — there is nobody to invite. The return below is the only thing that
    changed.
  */
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) {
    const member = await memberByEmail(input.viewer, email);
    /* ⚠ A `User` WITH NO `Person` HAS NO CARD. Falling back to the old sentence
       beats drawing a member row with no name in it. */
    if (!member) return { ok: false, reason: "already_member" };
    return { ok: true, outcome: "already_member", member };
  }

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
    await sendEmail({
      to: email,
      subject,
      html,
      text,
      template: "colleague-invite",
      subjectType: "ColleagueInvite",
      subjectId: row.id,
    });
    return { ok: true, outcome: "sent", sent: true };
  } catch {
    void row;
    return { ok: true, outcome: "sent", sent: false, devLink: url };
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

/**
 * ── ⚠⚠⚠ CREDIT THE INVITATION THAT BROUGHT THIS PERSON IN (`E599` WS-C) ───
 *
 * ⚠ SCOTT, 2026-09-22: *"acceptance link the joined person to the invite, so
 * Joined can count."*
 *
 * ⚠⚠ MEASURED AT WS-A's PREMISE CHECK: **`accepted_at` had no writer anywhere
 * in `src/`.** `invite-colleague/page.tsx` recorded the gap in terms —
 * *"ACCEPTED/`accepted_at` are there for the day an account-create hook writes
 * them. ⚠ THIS PAGE DOES NOT INVENT THAT HOOK; that would be a change to
 * signup, which this brief does not open."* ⚠⚠⚠ THIS BRIEF OPENS IT, AND THIS
 * IS THE HOOK. Until it existed, `Joined` was structurally 0 for every member
 * and the whole scoring half of `E599` could never move off zero.
 *
 * ── ⚠⚠ ONE CREDIT PER JOINED PERSON, FIRST INVITE WINS (WS-C 3) ──────────
 *
 * ⚠ `orderBy: created_at asc` IS THE RULE, not a tidy default: two people can
 * invite the same address, and the one who got there first earns it.
 * ⚠⚠ `status: "PENDING"` IS WHAT MAKES IT IDEMPOTENT — a second call for the
 * same person finds nothing, because the first call moved the row to ACCEPTED.
 * ⚠⚠⚠ SO A SIGNUP PATH THAT RETRIES, OR A PERSON WHO SOMEHOW SIGNS UP TWICE,
 * CANNOT PAY THE INVITER TWICE.
 *
 * ── ⚠ IT CAN NEVER FAIL A SIGNUP ────────────────────────────────────────
 *
 * ⚠⚠ THE ACCOUNT HAS ALREADY BEEN CREATED WHEN THIS RUNS. A throw here would
 * turn a crediting outage into a REGISTRATION outage — the same rule `E522`'s
 * `SentEmail` receipt follows (*"a receipt can never fail a send"*). Caught,
 * logged, not rethrown.
 * ⚠ IT IS DELIBERATELY NOT IN THE SIGNUP TRANSACTION for the same reason: a
 * locked `colleague_invites` row must not be able to roll back a new member.
 *
 * @returns the credited invite's id, or `null` when there was nothing to credit
 *          (which is the ordinary case — most people are not invited).
 */
export async function creditColleagueInvite(
  email: string,
  personId: string
): Promise<string | null> {
  try {
    const normalized = normalizeEmail(email);
    /* ⚠ The FIRST still-pending invitation to this address. */
    const invite = await prisma.colleagueInvite.findFirst({
      where: { invitee_email: normalized, status: "PENDING" },
      orderBy: { created_at: "asc" },
      select: { id: true },
    });
    if (!invite) return null;

    /*
      ⚠⚠ THE `status` FILTER IS REPEATED IN THE **UPDATE**, not just the read.
      Two signups racing the same address would both pass the read; only one can
      pass this, because the first flips the row out of PENDING.
      ⚠⚠⚠ `updateMany` RATHER THAN `update` SO A LOST RACE IS `count: 0`
      INSTEAD OF A THROW — the loser records nothing and the signup is untouched.
    */
    const done = await prisma.colleagueInvite.updateMany({
      where: { id: invite.id, status: "PENDING" },
      data: {
        status: "ACCEPTED",
        accepted_at: new Date(),
        accepted_person_id: personId,
      },
    });
    return done.count === 1 ? invite.id : null;
  } catch (err) {
    /* ⚠ The member exists; this is bookkeeping. Never rethrow. */
    console.error("[colleague-invite] credit failed", err);
    return null;
  }
}

/**
 * ⚠⚠ THE SIGNUP-SIDE WRAPPER. The four account-creation paths all end holding a
 * `userId` and an email; only some of them hold a `Person` id in scope, and
 * `oauth.ts` creates no `Person` at all.
 *
 * ⚠⚠⚠ CALL IT **AFTER** THE TRANSACTION COMMITS, NEVER INSIDE ONE. A locked
 * `colleague_invites` row must not be able to roll back a new member, and this
 * is bookkeeping about an account that already exists.
 * ⚠ NO PERSON MEANS NO CREDIT, SILENTLY — an OAuth account with no `Person` has
 * nobody to attribute, and that is a real state, not an error.
 */
export async function creditInviteForNewUser(
  userId: string,
  email: string
): Promise<string | null> {
  try {
    const person = await prisma.person.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!person) return null;
    return await creditColleagueInvite(email, person.id);
  } catch (err) {
    console.error("[colleague-invite] credit lookup failed", err);
    return null;
  }
}
