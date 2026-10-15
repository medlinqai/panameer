// BC walk (lib level, throwaway parties): new buyer → Company (one address) → Location same → Review → order gate ready;
// second buyer matched by email domain → Ask to Join → approved → can order; website match; hand over admin; never-match domain.
import { prisma } from "@/lib/prisma";
import { party, cleanup, check, done, made, refuses, type Party } from "./lib/dev-fixture";
import { defineCompany, findRegistrationMatch, joinCompany, decideRequest, changeMember } from "@/lib/company";
import { saveRequesterStep, getRequesterState, completeRequester } from "@/lib/requester-onboarding";
import { assertCanSign } from "@/lib/your-path";
import { matchableEmailDomain } from "@/lib/platform-settings";

const DOMAIN = `bcwalk${Date.now().toString(36)}.example`;
async function buyer(first: string, email: string): Promise<Party> {
  const p = await party("BUYER", first);
  await prisma.user.update({ where: { id: p.viewer.userId }, data: { email, email_verified: new Date() } });
  await prisma.requesterProfile.create({ data: { person_id: p.personId } });
  return { ...p, email };
}

async function main() {
  const a = await buyer("Ana", `ana@${DOMAIN}`);
  await defineCompany(a.viewer, { name: "BC Walk Co", website: `www.${DOMAIN}`, attestation: true, companyTos: true });
  const ind = await prisma.specialization.findFirst({ where: { kind: "INDUSTRY", status: "ACTIVE" }, select: { id: true } });
  await saveRequesterStep(a.viewer, "company", { companyBound: true, companyDetails: { industryId: ind?.id ?? null, address: { line1: "1 Main St", city: "Austin", state: "TX", postalCode: "78701", country: "US" }, invoiceEmail: null } });
  let s = await getRequesterState(a.viewer);
  check("Company step: owner, industry, address, invoice email defaults to the buyer's email", s.company.owner && s.company.industryId === (ind?.id ?? null) && s.company.address?.line1 === "1 Main St" && s.company.invoiceEmail === a.email);
  await saveRequesterStep(a.viewer, "work_location", { sameAsCompany: true });
  s = await getRequesterState(a.viewer);
  check("Location: same as company address", s.sameAsCompany && s.profile.workLocation?.line1 === "1 Main St");
  await completeRequester(a.viewer);
  const coId = (await prisma.companyMembership.findFirstOrThrow({ where: { person_id: a.personId, status: "APPROVED" } })).company_id;
  const seller = await party("PROVIDER", "Sol");
  const sCo = await prisma.company.findFirstOrThrow({ where: { p_account_id: seller.pAccountId }, select: { id: true } });
  await prisma.companyMembership.create({ data: { person_id: seller.personId, company_id: sCo.id, role: "ADMIN", status: "APPROVED" } });
  let gateOk = true;
  try { await assertCanSign(a.personId, a.personId, seller.personId); } catch { gateOk = false; }
  check("first order: no billing prompt (captured at registration)", gateOk);

  const b = await buyer("Ben", `ben@${DOMAIN}`);
  const m = await findRegistrationMatch(b.viewer, "");
  check("second buyer: email-domain match names the company", m.match?.id === coId && m.reason === "email", JSON.stringify(m));
  await refuses("defining a duplicate is refused with the Ask to Join wording", () => defineCompany(b.viewer, { name: "Dup", attestation: true, companyTos: true }), "Ask to join");
  const w = await findRegistrationMatch(b.viewer, DOMAIN);
  check("website match also found (reason website)", w.match?.id === coId && w.reason === "website");
  await joinCompany(b.viewer, { companyId: coId, attestation: true, matchedOn: "email" });
  await saveRequesterStep(b.viewer, "company", { companyBound: true });
  const sb = await getRequesterState(b.viewer);
  check("joiner skips address/industry (not owner), sees the company address", !sb.company.owner && sb.company.status === "PENDING" && !!sb.company.address);
  const req = await prisma.companyMembership.findFirstOrThrow({ where: { person_id: b.personId, company_id: coId } });
  await decideRequest(a.viewer, req.id, "APPROVED");
  let bOk = true;
  try { await assertCanSign(b.personId, b.personId, seller.personId); } catch { bOk = false; }
  check("approved → second buyer can order", bOk);

  const aM = await prisma.companyMembership.findFirstOrThrow({ where: { person_id: a.personId, company_id: coId } });
  await refuses("sole admin can't step down", () => changeMember(a.viewer, aM.id, "step_down"), "admin");
  await changeMember(a.viewer, req.id, "hand_over");
  const roles = await prisma.companyMembership.findMany({ where: { company_id: coId, status: "APPROVED" }, select: { person_id: true, role: true } });
  check("hand over: Ben admin, Ana member", roles.find((r) => r.person_id === b.personId)?.role === "ADMIN" && roles.find((r) => r.person_id === a.personId)?.role === "MEMBER");

  check("panameer.com never auto-matches", (await matchableEmailDomain("panameer.com")) === null && (await matchableEmailDomain(DOMAIN)) === DOMAIN);
}

main()
  .catch((e) => check("walk threw", false, (e as Error).stack))
  .finally(async () => {
    try {
      const cos = (await prisma.companyMembership.findMany({ where: { person_id: { in: made.persons } }, select: { company_id: true } })).map((x) => x.company_id);
      await prisma.notification.deleteMany({ where: { person_id: { in: made.persons } } });
      await prisma.requesterProfile.deleteMany({ where: { person_id: { in: made.persons } } });
      await prisma.companyMembership.deleteMany({ where: { person_id: { in: made.persons } } });
      const extra = (await prisma.company.findMany({ where: { id: { in: cos } }, select: { p_account_id: true } })).map((c) => c.p_account_id).filter((id) => !made.accounts.includes(id));
      made.accounts.push(...extra);
      await prisma.person.updateMany({ where: { id: { in: made.persons } }, data: { site_id: null } });
      await cleanup();
      const left = await prisma.company.count({ where: { id: { in: cos } } }) + (await prisma.person.count({ where: { id: { in: made.persons } } }));
      check("throwaway rows removed", left === 0, `${left} left`);
    } catch (e) {
      check("cleanup", false, (e as Error).message);
    }
    process.exitCode = done("BC walk");
    await prisma.$disconnect();
  });
