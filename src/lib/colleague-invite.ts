import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { colleagueInviteTemplate } from "@/lib/email/templates/colleague-invite";
import { memberByEmail, type MemberWithRelation } from "@/lib/connections";
import type { Viewer } from "@/lib/access";
import { ensureSlug } from "@/lib/public-slug";

/** How long an invitation stays good for. */
export const INVITE_TTL_DAYS = 30;

export const INVITE_LIMIT_PER_HOUR = 10;
export const INVITE_LIMIT_PER_DAY = 40;

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

export async function inviteColleague(input: {
  inviterPersonId: string;
  viewer: Viewer;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  message?: string | null;
  origin: string;
}): Promise<InviteResult> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) return { ok: false, reason: "invalid" };

  const allowance = await inviteAllowance(input.inviterPersonId);
  if (allowance.hourRemaining <= 0 || allowance.dayRemaining <= 0) {
    return { ok: false, reason: "rate_limited", retryAfterMs: 3_600_000 };
  }

  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) {
    const member = await memberByEmail(input.viewer, email);
    if (!member) return { ok: false, reason: "already_member" };
    return { ok: true, outcome: "already_member", member };
  }

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
    select: {
      first_name: true,
      last_name: true,
      title: true,
      companyMemberships: {
        where: { status: "APPROVED" },
        take: 1,
        orderBy: { created_at: "asc" },
        select: { company: { select: { name: true, website: true, show_on_profiles: true } } },
      },
      providerProfile: { select: { id: true, onboarding_completed_at: true } },
    },
  });
  // "View <First>'s Profile" opens the public profile when there is one; else the invitation page.
  const slug = inviter?.providerProfile?.onboarding_completed_at ? await ensureSlug(inviter.providerProfile.id) : null;
  const member = inviter?.companyMemberships[0]?.company;
  const co = member?.show_on_profiles ? member : null;
  const inviterName =
    `${inviter?.first_name ?? ""} ${inviter?.last_name ?? ""}`.trim() || "A colleague";

  const url = `${input.origin}/invite/colleague/${raw}`;
  const { subject, html, text } = colleagueInviteTemplate({
    inviterName,
    inviterFirstName: inviter?.first_name ?? null,
    inviterTitle: inviter?.title?.trim() || null,
    inviterCompany: co?.name ?? null,
    companyUrl: co?.website ? (/^https?:/.test(co.website) ? co.website : `https://${co.website}`) : null,
    inviteeName: input.firstName?.trim() || null,
    message: input.message?.trim() || null,
    profileUrl: slug ? `${input.origin}/pro/${slug}` : null,
    joinUrl: url,
  });

  // SUPPRESSION IS NOT CHECKED HERE, AND THAT IS CORRECT. checks
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

/** CREDIT THE INVITATION THAT BROUGHT THIS PERSON IN ( WS-C) */
export async function creditColleagueInvite(
  email: string,
  personId: string
): Promise<string | null> {
  try {
    const normalized = normalizeEmail(email);
    /* The FIRST still-pending invitation to this address. */
    const invite = await prisma.colleagueInvite.findFirst({
      where: { invitee_email: normalized, status: "PENDING" },
      orderBy: { created_at: "asc" },
      select: { id: true },
    });
    if (!invite) return null;

    // THE `status` FILTER IS REPEATED IN THE UPDATE, not just the read.
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
    /* The member exists; this is bookkeeping. Never rethrow. */
    console.error("[colleague-invite] credit failed", err);
    return null;
  }
}

/** THE SIGNUP-SIDE WRAPPER. The four account-creation paths all end holding a */
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
