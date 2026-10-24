import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { deriveAccessFlags } from "@/lib/access";
import { getActorFlags } from "@/lib/actor-flags";

// PI-E001: a punch-in is a sign-in. The ERP vouched for the requester, so they get a normal NextAuth session (same cookie,
// same JWT) for the length of the punch-in, carrying punchoutSessionId. Only people of the connection's company qualify.
export type PunchinSignIn = { ok: true; cookieName: string; cookieValue: string; maxAge: number; options: Record<string, unknown> } | { ok: false; reason: string };

/** The requester's User — created from the cXML email when missing (no password, flagged via_punchout) — and their APPROVED membership. */
async function ensureUser(sessionId: string): Promise<{ userId: string } | { reason: string }> {
  const s = await prisma.punchoutSession.findUnique({ where: { id: sessionId }, select: { requester_person_id: true, connection_id: true } });
  if (!s?.requester_person_id) return { reason: "This punch-in has no requester." };
  const conn = await prisma.erpConnection.findUnique({ where: { id: s.connection_id }, select: { p_account_id: true } });
  const person = await prisma.person.findUnique({ where: { id: s.requester_person_id }, select: { id: true, user_id: true, first_name: true, last_name: true, company_id: true, company: { select: { p_account_id: true } }, requesterProfile: { select: { buyer_email: true } } } });
  if (!person || !conn || person.company?.p_account_id !== conn.p_account_id) return { reason: "Only people of this ERP's company can punch in." };
  let userId = person.user_id;
  if (!userId) {
    const email = person.requesterProfile?.buyer_email?.trim().toLowerCase();
    if (!email) return { reason: "Your ERP didn't send your email, so Panameer can't sign you in. Ask your ERP admin to include it." };
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true, person: { select: { id: true, company: { select: { p_account_id: true } } } } } });
    if (taken) {
      // An existing Panameer user with this email: only usable if they belong to the same customer account.
      if (taken.person?.company?.p_account_id !== conn.p_account_id) return { reason: "That email belongs to a Panameer account in another company." };
      userId = taken.id;
    } else {
      userId = (await prisma.user.create({ data: { email, first_name: person.first_name, last_name: person.last_name === "—" ? "" : person.last_name, role: "MEMBER", via_punchout: true }, select: { id: true } })).id;
      await prisma.person.update({ where: { id: person.id }, data: { user_id: userId, is_service_buyer: true } });
    }
  }
  if (person.company_id) {
    await prisma.companyMembership.upsert({
      where: { person_id_company_id: { person_id: person.id, company_id: person.company_id } },
      create: { person_id: person.id, company_id: person.company_id, role: "MEMBER", status: "APPROVED", decided_at: new Date(), auto_approved: true, matched_on: "ERP_PUNCHIN" },
      update: {},
    });
  }
  return { userId };
}

export async function punchinSignIn(sessionId: string): Promise<PunchinSignIn> {
  const u = await ensureUser(sessionId);
  if ("reason" in u) return { ok: false, reason: u.reason };
  const s = await prisma.punchoutSession.findUniqueOrThrow({ where: { id: sessionId }, select: { expires_at: true } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: u.userId }, select: { id: true, email: true, first_name: true, last_name: true, role: true, is_system_admin: true } });
  const flags = deriveAccessFlags({ role: user.role, isSystemAdmin: user.is_system_admin });
  const actor = await getActorFlags(user.id);
  const maxAge = Math.max(60, Math.floor((s.expires_at.getTime() - Date.now()) / 1000));
  const token = {
    sub: user.id, email: user.email, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
    role: user.role, isSystemAdmin: false, isAdmin: flags.isAdmin, ...actor,
    punchoutSessionId: sessionId, punchoutUntil: s.expires_at.getTime(),
  };
  const cookie = authOptions.cookies!.sessionToken!;
  const value = await encode({ token, secret: process.env.NEXTAUTH_SECRET!, maxAge });
  await prisma.user.update({ where: { id: user.id }, data: { last_login: new Date() } }).catch(() => null);
  return { ok: true, cookieName: cookie.name, cookieValue: value, maxAge, options: cookie.options as Record<string, unknown> };
}
