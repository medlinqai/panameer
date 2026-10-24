import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

// EO-E004: after a self-onboarding punch-in — the requester's welcome (confirm link) and the Panameer admin notice.
// Nothing waits on either: the connection already shops.
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const APP = "https://app.panameer.com";

export async function afterSelfOnboard(made: { conn: { id: string; from_identity: string; flag: string | null }; personId: string; companyName: string; email: string; hasUser: boolean }, origin: string): Promise<void> {
  const base = (process.env.NEXTAUTH_URL ?? origin).replace(/\/$/, "");
  const p = await prisma.person.findUnique({ where: { id: made.personId }, select: { first_name: true, last_name: true, user_id: true } });
  const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "ERP requester";
  if (made.email && made.hasUser) {
    const token = randomBytes(32).toString("base64url");
    await prisma.erpOnboardingToken.create({ data: { connection_id: made.conn.id, person_id: made.personId, token_hash: sha(token), expires_at: new Date(Date.now() + 7 * 86_400_000) } });
    const { erpConnectedTemplate } = await import("@/lib/email/templates/erp-connected");
    const { sendEmail } = await import("@/lib/resend");
    const t = erpConnectedTemplate({ firstName: p?.first_name ?? "", companyName: made.companyName, identity: made.conn.from_identity, confirmUrl: `${base}/erp/confirm?t=${token}`, connectUrl: `${APP}/erp/connect`, logoUrl: `${base}/brand/panameer-lockup-ink.png` });
    await sendEmail({ to: made.email, ...t, template: "erp-connected", category: "account.registration", userId: p?.user_id ?? null, subjectType: "erp_connection", subjectId: made.conn.id });
  }
  const admins = await prisma.person.findMany({ where: { user: { is_system_admin: true, is_active: true } }, select: { id: true } });
  for (const a of admins) {
    await notify({ event: "admin.erp_connected", personId: a.id, entityType: "erp_connection", entityId: made.conn.id, dedupeKey: `admin.erp_connected:${made.conn.id}:${a.id}`, vars: { company: made.companyName, identity: made.conn.from_identity, requester: name, email: made.email || "no email", flag: made.conn.flag ?? "" } });
  }
}

/** The confirm link: valid, unused, unexpired → its connection, person and company. */
export async function onboardingFor(token: string) {
  const t = await prisma.erpOnboardingToken.findUnique({ where: { token_hash: sha(token) } });
  if (!t || t.used_at || t.expires_at < new Date()) return null;
  const person = await prisma.person.findUnique({ where: { id: t.person_id }, select: { id: true, first_name: true, last_name: true, user: { select: { id: true, email: true } }, company: { select: { id: true, name: true } } } });
  if (!person?.user || !person.company) return null;
  return { tokenId: t.id, connectionId: t.connection_id, person };
}

/** Confirm Your Company & Set a Password → password, buyer terms, company name/address, connection ACTIVE. */
export async function confirmOnboarding(token: string, input: { password: string; companyName: string; line1: string; city: string; state: string; postalCode: string; country: string; acceptTerms: boolean }) {
  const ob = await onboardingFor(token);
  if (!ob) throw new Error("This link has expired or was already used.");
  if (!input.acceptTerms) throw new Error("Accept the buyer terms to continue.");
  if (input.password.length < 8) throw new Error("Use at least 8 characters for your password.");
  if (!input.companyName.trim()) throw new Error("Enter your company's name.");
  const { hashPassword } = await import("@/lib/password");
  const { USER_TOS_VERSION } = await import("@/lib/tos");
  const { countryColumns } = await import("@/lib/country");
  const hash = await hashPassword(input.password);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const used = await tx.erpOnboardingToken.updateMany({ where: { id: ob.tokenId, used_at: null }, data: { used_at: now } });
    if (!used.count) throw new Error("This link was already used.");
    await tx.user.update({ where: { id: ob.person.user!.id }, data: { password_hash: hash, email_verified: now, tos_accepted_at: now, tos_version: USER_TOS_VERSION } });
    await tx.company.update({ where: { id: ob.person.company!.id }, data: { name: input.companyName.trim().slice(0, 120), legal_name: input.companyName.trim().slice(0, 200) } });
    if (input.line1.trim()) {
      const site = await tx.site.create({ data: { company_id: ob.person.company!.id, name: "Primary" } });
      await tx.address.create({ data: { site_id: site.id, line1: input.line1.trim(), city: input.city.trim() || null, state: input.state.trim() || null, postal_code: input.postalCode.trim() || null, ...countryColumns(input.country), is_corporate: true, is_bill_to: true } });
    }
    await tx.erpConnection.update({ where: { id: ob.connectionId }, data: { status: "ACTIVE", confirmed_at: now, name: input.companyName.trim().slice(0, 120) } });
  });
  return { email: ob.person.user!.email };
}

/** ES-E005: after Create My Company — the values (and a set-password link) to the requester and the ERP admin; the Panameer admin notice. */
export async function afterSetup(r: { values: import("@/lib/erp/setup-create").SetupValues; personId: string; connectionId: string; userId: string; email: string; erpAdminEmail: string; firstName: string }, origin: string): Promise<void> {
  const base = (process.env.NEXTAUTH_URL ?? origin).replace(/\/$/, "");
  const token = randomBytes(32).toString("base64url");
  await prisma.erpOnboardingToken.create({ data: { connection_id: r.connectionId, person_id: r.personId, token_hash: sha(token), expires_at: new Date(Date.now() + 7 * 86_400_000) } });
  const { erpSetupTemplate } = await import("@/lib/email/templates/erp-connected");
  const { sendEmail } = await import("@/lib/resend");
  const to = [...new Set([r.email, r.erpAdminEmail].filter(Boolean))];
  for (const addr of to) {
    const t = erpSetupTemplate({ firstName: addr === r.email ? r.firstName : "", companyName: r.values.companyName, values: r.values, passwordUrl: addr === r.email ? `${base}/erp/confirm?t=${token}` : null, connectUrl: `${APP}/erp/connect`, logoUrl: `${base}/brand/panameer-lockup-ink.png` });
    await sendEmail({ to: addr, ...t, template: "erp-setup", category: "account.registration", userId: addr === r.email ? r.userId : null, subjectType: "erp_connection", subjectId: r.connectionId });
  }
  const admins = await prisma.person.findMany({ where: { user: { is_system_admin: true, is_active: true } }, select: { id: true } });
  for (const a of admins) {
    await notify({ event: "admin.erp_connected", personId: a.id, entityType: "erp_connection", entityId: r.connectionId, dedupeKey: `admin.erp_connected:${r.connectionId}:${a.id}`, vars: { company: r.values.companyName, identity: r.values.identity, requester: r.firstName, email: r.email, flag: "", setup: "1" } });
  }
}
