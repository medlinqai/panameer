import { prisma } from "@/lib/prisma";
import { nextNumber } from "@/lib/numbering";
import { USER_TOS_VERSION } from "@/lib/tos";

// MS-E001: the Panameer Terms of Service serve as one global MSA; every Work Order is a SOW under the Active one.
export const MSA_TITLE = "Panameer Master Services Agreement (Terms of Service)";
export const MSA_URL = "/terms";

/** The Panameer company (its code numbers the MSA). */
async function panameerCompanyId(): Promise<string> {
  const c = await prisma.company.findFirst({ where: { code: "PANAM" }, select: { id: true } }) ?? await prisma.company.findFirst({ where: { name: "Panameer" }, orderBy: { created_at: "asc" }, select: { id: true } });
  if (c) return c.id;
  const acct = await prisma.pAccount.create({ data: { kind: "BOTH", name: "Panameer" }, select: { id: true } });
  return (await prisma.company.create({ data: { p_account_id: acct.id, name: "Panameer", code: "PANAM" }, select: { id: true } })).id;
}

/** The Active MSA for the current ToS version — created (and the old one Superseded) when the version changes. */
export async function activeMsa() {
  const live = await prisma.agreement.findFirst({ where: { kind: "MSA", status: "ACTIVE" }, orderBy: { effective_date: "desc" } });
  if (live && live.version === USER_TOS_VERSION) return live;
  const number = await nextNumber("MS", { companyId: await panameerCompanyId() });
  const created = await prisma.agreement.create({ data: { agreement_number: number, kind: "MSA", title: MSA_TITLE, version: USER_TOS_VERSION, effective_date: new Date(), document_url: MSA_URL } });
  if (live) await prisma.agreement.update({ where: { id: live.id }, data: { status: "SUPERSEDED" } });
  return created;
}
