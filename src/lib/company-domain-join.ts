import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";
import { emailDomain, isWorkDomain } from "@/lib/tos";
import { OnboardingError } from "@/lib/onboarding";

// Company email domain + join requests (Scott 2026-10-05): a matching domain means they ASK; an admin approves.

/** An admin sets the company's domain — only their own verified, non-free-mail email domain. */
export async function setCompanyDomain(viewer: Viewer, raw: string) {
  const domain = raw.trim().toLowerCase().replace(/^@/, "");
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true, user: { select: { email: true, email_verified: true } } },
  });
  if (!person) throw new OnboardingError("No person record", "INVALID");
  const admin = await prisma.companyMembership.findFirst({
    where: { person_id: person.id, role: "ADMIN", status: "APPROVED" },
    select: { company_id: true },
  });
  if (!admin) throw new OnboardingError("Only a company admin can set the email domain", "GATE_UNMET");
  if (!isWorkDomain(domain)) throw new OnboardingError("Use your company's own domain — free email domains can't be claimed", "INVALID");
  if (!person.user?.email_verified) throw new OnboardingError("Verify your email first", "INVALID");
  if (emailDomain(person.user.email) !== domain) {
    throw new OnboardingError(`Your verified email has to be on ${domain} to claim it`, "INVALID");
  }
  const taken = await prisma.company.findFirst({ where: { email_domain: domain, id: { not: admin.company_id } }, select: { id: true } });
  if (taken) throw new OnboardingError("Another company on Panameer already uses that domain", "INVALID");
  await prisma.company.update({ where: { id: admin.company_id }, data: { email_domain: domain } });
  return { companyId: admin.company_id, domain };
}

/** Tell every admin of the company that someone asked to join. */
export async function notifyJoinRequested(companyId: string, askerPersonId: string) {
  const [company, asker, admins] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
    prisma.person.findUnique({ where: { id: askerPersonId }, select: { first_name: true, last_name: true } }),
    prisma.companyMembership.findMany({ where: { company_id: companyId, role: "ADMIN", status: "APPROVED" }, select: { person_id: true } }),
  ]);
  const askerName = `${asker?.first_name ?? ""} ${asker?.last_name ?? ""}`.trim() || "Someone";
  for (const a of admins)
    await notify({
      event: "company.join_requested",
      personId: a.person_id,
      entityType: "company",
      entityId: companyId,
      dedupeKey: `company.join_requested:${companyId}:${askerPersonId}:${a.person_id}`,
      vars: { askerName, companyName: company?.name ?? "your company" },
    });
}

/** Tell the asker the outcome and clear the admins' worklist rows. */
export async function notifyJoinDecided(companyId: string, askerPersonId: string, approved: boolean) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  await notify({
    event: approved ? "company.join_approved" : "company.join_declined",
    personId: askerPersonId,
    entityType: "company",
    entityId: companyId,
    dedupeKey: `company.join_decided:${companyId}:${askerPersonId}`,
    vars: { companyName: company?.name ?? "the company" },
  });
  await prisma.notification
    .updateMany({
      where: { dedupe_key: { startsWith: `company.join_requested:${companyId}:${askerPersonId}:` }, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
}
