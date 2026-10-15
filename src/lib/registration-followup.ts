import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { appBaseUrl, hashToken } from "@/lib/verification";
import { notify } from "@/lib/notifications";
import { personalFollowupTemplate, registrationReminderTemplate } from "@/lib/email/templates/registration-reminder";

// SO-E006–E009: people who signed up but didn't finish registration (buyer or seller), idle ≥ 24 h.
// Activity = a registration save (touchRegistration) or a sign-in (users.last_login).
const H = 3600_000;
const BUYER_STEP: Record<string, string> = { REQUESTER_INFO: "Buyer", COMPANY: "Company", WORK_LOCATION: "Locations", REVIEW: "Review" };
const SELLER_STEP: Record<string, string> = { seller: "Seller", company: "Company", locations: "Locations", review: "Review" };
export const STOP_REASONS = ["No time", "Didn't understand", "Not a fit", "Company/approval issue", "Testing", "Other"] as const;

export async function touchRegistration(personId: string) {
  await prisma.registrationFollowup.upsert({ where: { person_id: personId }, create: { person_id: personId }, update: { last_activity_at: new Date() } }).catch(() => {});
}

export type Stopped = {
  personId: string; userId: string; name: string; email: string; firstName: string; side: "Buyer" | "Seller"; stoppedAt: string; verified: boolean;
  signedUp: Date; lastActivity: Date; reminders: number; followedUp: boolean; reason: string | null; note: string | null;
  reminder1At: Date | null; reminder2At: Date | null; adminNotifiedAt: Date | null;
};

export async function stoppedPartway(now = new Date(), idleHours = 24): Promise<Stopped[]> {
  const people = await prisma.person.findMany({
    where: {
      user: { is_system_admin: false, is_active: true },
      OR: [
        { requesterProfile: { completed_at: null } },
        { providerProfile: { registration_completed_at: null, onboarding_completed_at: null }, companyMemberships: { none: { status: { in: ["APPROVED", "PENDING"] } } } },
      ],
    },
    select: {
      id: true, first_name: true, last_name: true, created_at: true,
      user: { select: { id: true, email: true, email_verified: true, last_login: true, created_at: true } },
      requesterProfile: { select: { completed_at: true, onboarding_step: true } },
      providerProfile: { select: { registration_step: true } },
      registrationFollowup: true,
    },
    take: 2000,
  });
  const out: Stopped[] = [];
  for (const p of people) {
    if (!p.user) continue;
    const f = p.registrationFollowup;
    const last = new Date(Math.max(p.user.created_at.getTime(), p.user.last_login?.getTime() ?? 0, f?.last_activity_at.getTime() ?? 0));
    if (now.getTime() - last.getTime() < idleHours * H) continue;
    const seller = !!p.providerProfile && !(p.requesterProfile && !p.requesterProfile.completed_at);
    const stoppedAt = !p.user.email_verified ? "Verify Your Email" : seller ? SELLER_STEP[p.providerProfile?.registration_step ?? "seller"] ?? "Seller" : BUYER_STEP[p.requesterProfile?.onboarding_step ?? "REQUESTER_INFO"] ?? "Buyer";
    out.push({
      personId: p.id, userId: p.user.id, email: p.user.email, firstName: p.first_name ?? "", name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.user.email,
      side: seller ? "Seller" : "Buyer", stoppedAt, verified: !!p.user.email_verified, signedUp: p.user.created_at, lastActivity: last,
      reminders: (f?.reminder1_at ? 1 : 0) + (f?.reminder2_at ? 1 : 0), followedUp: !!f?.followed_up_at, reason: f?.reason ?? null, note: f?.note ?? null,
      reminder1At: f?.reminder1_at ?? null, reminder2At: f?.reminder2_at ?? null, adminNotifiedAt: f?.admin_notified_at ?? null,
    });
  }
  return out.sort((a, b) => b.signedUp.getTime() - a.signedUp.getTime());
}

/** Where the button goes: a fresh verification link if not verified, else the step they stopped at. */
async function resumeUrl(s: Stopped): Promise<string> {
  const base = appBaseUrl();
  if (!s.verified) {
    await prisma.verificationToken.deleteMany({ where: { user_id: s.userId, type: "EMAIL", consumed_at: null } });
    const raw = randomBytes(32).toString("base64url");
    await prisma.verificationToken.create({ data: { user_id: s.userId, token_hash: hashToken(raw), type: "EMAIL", expires_at: new Date(Date.now() + 7 * 24 * H) } });
    return `${base}/verify-email?token=${raw}`;
  }
  return `${base}${s.side === "Seller" ? "/join/provider/register" : "/join/requester/steps"}`;
}

/** SO-E007/E008, daily: Day 1 and Day 7 reminders (then stop), Day 8 the admins are told. Old idle accounts are never emailed. */
export async function runFollowups(now = new Date()) {
  const list = await stoppedPartway(now, 24);
  const done = { reminder1: 0, reminder2: 0, adminNotified: 0 };
  const base = appBaseUrl();
  for (const s of list) {
    const idle = (now.getTime() - s.lastActivity.getTime()) / H;
    const day = !s.reminder1At && idle < 6 * 24 ? 1 : s.reminder1At && !s.reminder2At && idle >= 7 * 24 && idle < 14 * 24 ? 7 : null;
    if (day) {
      const { subject, html, text } = registrationReminderTemplate({ firstName: s.firstName, step: s.stoppedAt, resumeUrl: await resumeUrl(s), day, logoUrl: `${base}/brand/panameer-lockup-ink.png` });
      await sendEmail({ to: s.email, subject, html, text, template: `registration-reminder-day${day}`, category: "account.registration", userId: s.userId, subjectType: "person", subjectId: s.personId });
      await prisma.registrationFollowup.upsert({ where: { person_id: s.personId }, create: { person_id: s.personId, last_activity_at: s.lastActivity, ...(day === 1 ? { reminder1_at: now } : { reminder2_at: now }) }, update: day === 1 ? { reminder1_at: now } : { reminder2_at: now } });
      done[day === 1 ? "reminder1" : "reminder2"]++;
      continue;
    }
    if (s.reminder2At && !s.adminNotifiedAt && idle >= 8 * 24) {
      const admins = await prisma.person.findMany({ where: { user: { is_system_admin: true, is_active: true } }, select: { id: true } });
      for (const a of admins) await notify({ event: "admin.registration_stopped", personId: a.id, entityType: "person", entityId: s.personId, dedupeKey: `admin.registration_stopped:${s.personId}:${a.id}`, vars: { name: s.name, side: s.side, step: s.stoppedAt, days: Math.floor(idle / 24), personId: s.personId } });
      await prisma.registrationFollowup.update({ where: { person_id: s.personId }, data: { admin_notified_at: now } });
      done.adminNotified++;
    }
  }
  return done;
}

/** SO-E009: a personal email from an admin (their name, reply-to them). Marks admin follow-up done. */
export async function sendPersonalFollowup(adminUserId: string, personId: string, subject: string, body: string) {
  const [admin, p] = await Promise.all([
    prisma.user.findUnique({ where: { id: adminUserId }, select: { email: true, first_name: true, last_name: true } }),
    prisma.person.findUnique({ where: { id: personId }, select: { user: { select: { id: true, email: true } } } }),
  ]);
  if (!admin || !p?.user) throw new Error("Not found");
  const adminName = `${admin.first_name ?? ""} ${admin.last_name ?? ""}`.trim() || "Panameer";
  const { html, text } = personalFollowupTemplate({ body, adminName, logoUrl: `${appBaseUrl()}/brand/panameer-lockup-ink.png` });
  await sendEmail({ to: p.user.email, subject, html, text, replyTo: admin.email, fromName: adminName, template: "registration-personal-followup", category: "account.registration", userId: p.user.id, subjectType: "person", subjectId: personId });
  await prisma.registrationFollowup.upsert({ where: { person_id: personId }, create: { person_id: personId, personal_emails: 1, followed_up_at: new Date() }, update: { personal_emails: { increment: 1 }, followed_up_at: new Date() } });
}

/** SO-E009: why they stopped (reason + note). Marks admin follow-up done. */
export async function setStopReason(personId: string, reason: string, note: string | null) {
  await prisma.registrationFollowup.upsert({ where: { person_id: personId }, create: { person_id: personId, reason, note, followed_up_at: new Date() }, update: { reason, note, followed_up_at: new Date() } });
}
