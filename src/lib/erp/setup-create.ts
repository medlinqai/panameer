import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/erp/connections";
import { FREE_MAIL } from "@/lib/erp/self-onboard";
import type { PunchoutSessionLive } from "@/lib/erp/punchout";

// ES-E003/E004: Set Up Panameer → the customer account + Company, the requester as its admin, and the real ERP connection
// with a generated identity (PNM- + 8) and a generated 32-character secret, shown once.
export type SetupInput = { companyName: string; line1: string; city: string; state: string; postalCode: string; country: string; firstName: string; lastName: string; email: string; erpAdminEmail: string; acceptTerms: boolean };
export type SetupValues = { identity: string; secret: string; punchoutUrl: string; supplierId: string; domain: string; companyName: string };
export class SetupError extends Error {}

const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const pick = (n: number) => Array.from(randomBytes(n), (b) => ALNUM[b % ALNUM.length]).join("");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function setupPrefill(s: PunchoutSessionLive) {
  const d = (s.setup_data ?? {}) as { name?: string; email?: string; employeeId?: string; companyName?: string };
  const name = d.name ?? "";
  // Oracle sends "Last, First".
  const [first, last] = name.includes(",") ? [name.split(",").slice(1).join(",").trim(), name.split(",")[0].trim()] : [name.split(/\s+/)[0] ?? "", name.split(/\s+/).slice(1).join(" ")];
  const domain = d.email?.split("@")[1] ?? "";
  return { firstName: first, lastName: last, email: d.email ?? "", employeeId: d.employeeId ?? "", companyName: d.companyName || (domain && !FREE_MAIL.has(domain) ? domain.split(".")[0].replace(/^\w/, (c) => c.toUpperCase()) : "") };
}

export async function createFromSetup(s: PunchoutSessionLive, input: SetupInput): Promise<{ existing: true; companyName: string } | { existing: false; values: SetupValues; personId: string; connectionId: string; userId: string }> {
  if (s.connection.kind !== "SETUP") throw new SetupError("This isn't a setup session.");
  const email = input.email.trim().toLowerCase();
  const adminEmail = input.erpAdminEmail.trim().toLowerCase();
  if (!input.companyName.trim()) throw new SetupError("Enter your company's name.");
  if (!EMAIL.test(email)) throw new SetupError("Enter your email.");
  if (adminEmail && !EMAIL.test(adminEmail)) throw new SetupError("Check the ERP Admin Email.");
  if (!input.firstName.trim()) throw new SetupError("Enter your name.");
  if (!input.acceptTerms) throw new SetupError("Accept the buyer terms to continue.");
  // Already on Panameer (this email, or a company on this email domain) → ask your admin; tell that company's admins.
  const domain = email.split("@")[1];
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { person: { select: { company_id: true } } } });
  const existingCo = existingUser?.person?.company_id ? await prisma.company.findUnique({ where: { id: existingUser.person.company_id }, select: { id: true, name: true } })
    : !FREE_MAIL.has(domain) ? await prisma.company.findFirst({ where: { email_domain: domain, archived_at: null }, select: { id: true, name: true } }) : null;
  if (existingUser || existingCo) {
    if (existingCo) {
      const admins = await prisma.companyMembership.findMany({ where: { company_id: existingCo.id, role: "ADMIN", status: "APPROVED" }, select: { person_id: true } });
      const { notify } = await import("@/lib/notifications");
      for (const a of admins) await notify({ event: "company.erp_setup_existing", personId: a.person_id, entityType: "company", entityId: existingCo.id, dedupeKey: `company.erp_setup_existing:${existingCo.id}:${email}:${a.person_id}`, vars: { email, name: `${input.firstName} ${input.lastName}`.trim(), companyName: existingCo.name } });
    }
    return { existing: true, companyName: existingCo?.name ?? "your company" };
  }
  const { USER_TOS_VERSION } = await import("@/lib/tos");
  const { countryColumns } = await import("@/lib/country");
  const identity = `PNM-${pick(8)}`;
  const secret = randomBytes(24).toString("base64url").slice(0, 32);
  const companyName = input.companyName.trim().slice(0, 120);
  const pre = setupPrefill(s);
  const now = new Date();
  const made = await prisma.$transaction(async (tx) => {
    const acct = await tx.pAccount.create({ data: { kind: "BUYER", name: companyName, status: "ACTIVE" } });
    const company = await tx.company.create({ data: { p_account_id: acct.id, name: companyName, legal_name: companyName, email_domain: FREE_MAIL.has(domain) ? null : domain } });
    if (input.line1.trim()) {
      const site = await tx.site.create({ data: { company_id: company.id, name: "Primary" } });
      await tx.address.create({ data: { site_id: site.id, line1: input.line1.trim(), city: input.city.trim() || null, state: input.state.trim() || null, postal_code: input.postalCode.trim() || null, ...countryColumns(input.country), is_corporate: true, is_bill_to: true } });
    }
    const user = await tx.user.create({ data: { email, first_name: input.firstName.trim().slice(0, 100), last_name: input.lastName.trim().slice(0, 100), role: "MEMBER", tos_accepted_at: now, tos_version: USER_TOS_VERSION } });
    const person = await tx.person.create({ data: { company_id: company.id, user_id: user.id, first_name: input.firstName.trim().slice(0, 100), last_name: input.lastName.trim().slice(0, 100) || "—", status: "ACTIVE", is_service_buyer: true } });
    await tx.requesterProfile.create({ data: { person_id: person.id, employee_id: pre.employeeId || null, buyer_email: email, buyer_name: `${input.firstName} ${input.lastName}`.trim().slice(0, 200) } });
    await tx.companyMembership.create({ data: { person_id: person.id, company_id: company.id, role: "ADMIN", status: "APPROVED", decided_at: now, auto_approved: true, matched_on: "ERP_SETUP" } });
    const conn = await tx.erpConnection.create({
      data: { p_account_id: acct.id, name: companyName, kind: "ERP", from_identity: identity, sender_identity: identity, to_identity: "PANAMEER", shared_secret_hash: hashSecret(secret), created_via: "SELF", status: "ACTIVE", confirmed_at: now, first_contact_email: email, first_requester_person_id: person.id, flag: FREE_MAIL.has(domain) ? "Check Company" : null },
    });
    await tx.punchoutSession.update({ where: { id: s.id }, data: { expires_at: now } });
    return { personId: person.id, connectionId: conn.id, userId: user.id };
  });
  return { existing: false, ...made, values: { identity, secret, punchoutUrl: "https://app.panameer.com/api/cxml/punchout", supplierId: "PANAMEER", domain: "NetworkID", companyName } };
}
