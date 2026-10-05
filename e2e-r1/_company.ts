import bcrypt from "bcryptjs";
import { db } from "../e2e-shell/_db";
import { PASSWORD } from "./_fixture";

// Throwaway company for My Company tests: admin, member, pending asker, and a person with no company membership.
export type CoFixture = {
  tag: string;
  companyId: string;
  pAccountId: string;
  people: Record<"admin" | "member" | "asker" | "loner", { email: string; userId: string; personId: string }>;
};

export async function createCompanyFixture(): Promise<CoFixture> {
  const prisma = db();
  const tag = `myco-${Date.now()}`;
  const pa = await prisma.pAccount.create({ data: { kind: "BOTH", name: `MyCo Test ${tag}` }, select: { id: true } });
  const co = await prisma.company.create({
    data: { p_account_id: pa.id, name: `MyCo Test ${tag}`, legal_name: `MyCo Test ${tag} LLC`, tax_type: "LLC", tin: "12-3456789", email_domain: `${tag}.example` },
    select: { id: true },
  });
  const site = await prisma.site.create({ data: { company_id: co.id, name: "HQ" }, select: { id: true } });
  const hash = await bcrypt.hash(PASSWORD, 10);
  const mk = async (who: "admin" | "member" | "asker" | "loner") => {
    const email = `${tag}-${who}@example.seed`;
    const first = { admin: "Ada", member: "Mo", asker: "Ask", loner: "Lone" }[who];
    const u = await prisma.user.create({ data: { email, password_hash: hash, email_verified: new Date(), first_name: first, last_name: "MyCo" }, select: { id: true } });
    const p = await prisma.person.create({
      data: { user_id: u.id, first_name: first, last_name: "MyCo", company_id: co.id, site_id: site.id, is_service_buyer: true, is_service_provider: true },
      select: { id: true },
    });
    await prisma.providerProfile.create({ data: { person_id: p.id, status: "ACTIVE", currency: "USD", work_method: "SERVICES", onboarding_completed_at: new Date() } });
    if (who !== "loner")
      await prisma.companyMembership.create({
        data: {
          person_id: p.id,
          company_id: co.id,
          role: who === "admin" ? "ADMIN" : "MEMBER",
          status: who === "asker" ? "PENDING" : "APPROVED",
        },
      });
    return { email, userId: u.id, personId: p.id };
  };
  const people = { admin: await mk("admin"), member: await mk("member"), asker: await mk("asker"), loner: await mk("loner") };
  return { tag, companyId: co.id, pAccountId: pa.id, people };
}

export async function dropCompanyFixture(f: CoFixture | null) {
  if (!f) return;
  const prisma = db();
  const ids = Object.values(f.people);
  await prisma.person.deleteMany({ where: { id: { in: ids.map((p) => p.personId) } } });
  await prisma.user.deleteMany({ where: { id: { in: ids.map((p) => p.userId) } } });
  await prisma.company.deleteMany({ where: { id: f.companyId } });
  await prisma.pAccount.deleteMany({ where: { id: f.pAccountId } });
}
