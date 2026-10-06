import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { countryColumns } from "@/lib/country";
import { notify } from "@/lib/notifications";
import { OnboardingError } from "@/lib/onboarding";
import { uploadCertificationFile } from "@/lib/storage";

// Company v3 lane 2: who gets paid + the company's payout account. Admins only; every payout change tells every admin.
const KIND_LABEL = { BANK_ACCOUNT: "Bank (ACH)", WIRE: "Wire", PAYPAL: "PayPal" } as const;
export type PayoutKind = keyof typeof KIND_LABEL;

async function adminOf(viewer: Viewer) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true } });
  if (!me) throw new OnboardingError("No person record", "INVALID");
  const m = await prisma.companyMembership.findFirst({ where: { person_id: me.id, role: "ADMIN", status: "APPROVED" }, select: { company: { select: { id: true, name: true, tin: true, legal_name: true, country: true } } } });
  if (!m) throw new OnboardingError("Only a company admin can change this", "GATE_UNMET");
  return { me, company: m.company };
}

const approvedCount = (companyId: string) => prisma.companyMembership.count({ where: { company_id: companyId, status: "APPROVED" } });
const adminIds = async (companyId: string) =>
  (await prisma.companyMembership.findMany({ where: { company_id: companyId, role: "ADMIN", status: "APPROVED" }, select: { person_id: true } })).map((a) => a.person_id);

export async function setPayeeType(viewer: Viewer, type: "COMPANY" | "SOLE_PROPRIETOR") {
  const { company } = await adminOf(viewer);
  // Lifecycle: Panameer pays companies only; a one-person business is entered as a company.
  if (type === "SOLE_PROPRIETOR") throw new OnboardingError("Panameer pays companies only — enter a one-person business as a company.", "INVALID");
  await prisma.company.update({ where: { id: company.id }, data: { payee_type: type } });
  return { ok: true as const };
}

export async function companyPayouts(companyId: string) {
  return prisma.payoutMethod.findMany({ where: { company_id: companyId }, orderBy: { created_at: "asc" }, select: { id: true, kind: true, label: true, last4: true, country: true, is_default: true } });
}

async function tellAdmins(companyId: string, companyName: string, change: string, by: string) {
  const stamp = Date.now();
  for (const personId of await adminIds(companyId))
    await notify({ event: "company.payout_changed", personId, entityType: "company", entityId: companyId, dedupeKey: `company.payout_changed:${companyId}:${stamp}`, vars: { companyName, change, byName: by } });
}

const sameName = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === b.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function addCompanyPayout(viewer: Viewer, input: { kind: PayoutKind; label: string; last4?: string | null; country: string; holderName: string }) {
  const { me, company } = await adminOf(viewer);
  if (!company.tin) throw new OnboardingError("Add the company's tax ID in Legal & Tax first — Panameer can't pay a company without one.", "INVALID");
  const legal = company.legal_name?.trim() || company.name;
  if (!sameName(input.holderName, legal)) throw new OnboardingError(`The account holder must be ${legal} — Panameer pays companies only, to an account in the company's legal name.`, "INVALID");
  const last4 = (input.last4 ?? "").replace(/\D/g, "").slice(-4) || null;
  const count = await prisma.payoutMethod.count({ where: { company_id: company.id } });
  const cc = countryColumns(input.country);
  const row = await prisma.payoutMethod.create({
    data: { person_id: me.id, company_id: company.id, holder_name: input.holderName.trim().slice(0, 200), kind: input.kind, label: input.label.trim().slice(0, 80), last4, country: cc.country ?? input.country.trim().slice(0, 80), country_code: cc.country_code, is_default: count === 0 },
    select: { id: true },
  });
  const by = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || "An admin";
  await tellAdmins(company.id, company.name, `added ${KIND_LABEL[input.kind]} "${input.label.trim()}"${last4 ? ` ending ${last4}` : ""}`, by);
  return { ok: true as const, id: row.id };
}

export async function removeCompanyPayout(viewer: Viewer, id: string) {
  const { me, company } = await adminOf(viewer);
  const row = await prisma.payoutMethod.findFirst({ where: { id, company_id: company.id }, select: { kind: true, label: true, last4: true } });
  if (!row) throw new OnboardingError("That payout account is no longer here", "INVALID");
  await prisma.payoutMethod.delete({ where: { id } });
  const by = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || "An admin";
  await tellAdmins(company.id, company.name, `removed ${KIND_LABEL[row.kind as PayoutKind]} "${row.label}"${row.last4 ? ` ending ${row.last4}` : ""}`, by);
  return { ok: true as const };
}

/** A second member was approved while one person is paid: ask admins to switch to This company (never automatic). */
export async function nudgePayeeSwitch(companyId: string) {
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, payee_type: true } });
  if (c?.payee_type !== "SOLE_PROPRIETOR" || (await approvedCount(companyId)) < 2) return;
  for (const personId of await adminIds(companyId))
    await notify({ event: "company.payee_switch_needed", personId, entityType: "company", entityId: companyId, dedupeKey: `company.payee_switch_needed:${companyId}`, vars: { companyName: c.name } });
}

/** US companies upload a W-9; everyone else a W-8BEN-E (kept as provided, not verified). */
export const taxFormKindFor = (country: string | null | undefined) =>
  !country?.trim() || /^(us|usa|united states( of america)?)$/i.test(country.trim()) ? "W9" : "W8BENE";

export async function uploadCompanyTaxForm(viewer: Viewer, file: { name: string; type: string; size: number; bytes: ArrayBuffer }) {
  const { company } = await adminOf(viewer);
  if (!/^(application\/pdf|image\/(png|jpe?g))$/.test(file.type)) throw new OnboardingError("Upload a PDF, PNG or JPG.", "INVALID");
  if (file.size > 5 * 1024 * 1024) throw new OnboardingError("Keep the file under 5 MB.", "INVALID");
  const kind = taxFormKindFor(company.country);
  const path = await uploadCertificationFile(`company-tax/${company.id}`, file);
  await prisma.company.update({ where: { id: company.id }, data: { tax_form_kind: kind, tax_form_path: path, tax_form_uploaded_at: new Date() } });
  return { ok: true as const, kind };
}
