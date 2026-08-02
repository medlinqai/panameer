import type { PrismaClient } from "@prisma/client";

/**
 * Make every system admin a PANAMEER EMPLOYEE (WS5 / E003, E004, E006, E007).
 *
 * Extracted from `fix-admin-employee.ts` so the SEED can call it too. The seed
 * builds the admin as the demo Service Provider — company "Ceres Holdings",
 * title "Oracle Cloud P2P / Procurement Cloud Expert", $125/hr — because the
 * demo backbone and the admin login were created in one pass. That made the
 * platform operator look like a customer, and it came BACK every time anyone
 * re-seeded, which is why fixing the rows once wasn't enough.
 *
 * Narrow by design: it acts only on `is_system_admin` users, and it clears the
 * title ONLY when the title is literally the provider headline — a staff title
 * somebody typed on purpose survives.
 *
 * WHAT IT DOES NOT DO: delete a provider profile that has content. The demo
 * provider persona (4 employers, a package, 2 certs) still hangs off the admin's
 * Person row. It is inert — the profile view branches to the employee type for
 * an admin, and the row is not marketplace-visible — but it is still there.
 * Removing it properly means giving that persona its own login and name, which
 * is a product decision, not a cleanup.
 */
export async function makeAdminsEmployees(
  prisma: PrismaClient,
  { force = false, log = console.log }: { force?: boolean; log?: (s: string) => void } = {}
): Promise<number> {
  const admins = await prisma.user.findMany({
    where: { is_system_admin: true },
    select: {
      id: true,
      email: true,
      person: {
        select: {
          id: true,
          title: true,
          company: { select: { id: true, name: true } },
          providerProfile: {
            select: {
              id: true,
              headline: true,
              _count: {
                select: { employers: true, packages: true, certifications: true },
              },
            },
          },
        },
      },
    },
  });

  if (admins.length === 0) {
    log("No system admins found.");
    return 0;
  }

  // One Panameer P-Account → Company that every admin belongs to.
  const existing = await prisma.company.findFirst({
    where: { name: "Panameer" },
    select: { id: true },
  });

  let companyId = existing?.id ?? null;
  if (!companyId) {
    const account = await prisma.pAccount.create({
      data: {
        kind: "BOTH",
        name: "Panameer",
        status: "ACTIVE",
        companies: {
          create: {
            name: "Panameer",
            vertical: "Enterprise Services Marketplace",
            website: "https://panameer.com",
            sites: { create: { name: "Panameer HQ", open_for_business: true } },
          },
        },
      },
      select: { companies: { select: { id: true } } },
    });
    companyId = account.companies[0].id;
    log("created the Panameer company");
  }

  const site = await prisma.site.findFirst({
    where: { company_id: companyId },
    select: { id: true },
  });

  for (const a of admins) {
    if (!a.person) {
      log(`  ! ${a.email} has no Person — skipped`);
      continue;
    }

    const titleIsProviderHeadline =
      !!a.person.title &&
      !!a.person.providerProfile?.headline &&
      a.person.title === a.person.providerProfile.headline;

    const moved = a.person.company?.name !== "Panameer";

    await prisma.person.update({
      where: { id: a.person.id },
      data: {
        company_id: companyId,
        ...(site ? { site_id: site.id } : {}),
        ...(titleIsProviderHeadline ? { title: "Platform Administrator" } : {}),
        // An employee is none of the marketplace actors. This is what makes the
        // badge stop reading "Recruiter Basic".
        is_service_provider: false,
        is_service_buyer: false,
        is_service_coordinator: false,
        is_support: true,
      },
    });

    if (titleIsProviderHeadline) {
      log(`  ${a.email}: title "${a.person.title}" → "Platform Administrator"`);
    }
    if (moved) {
      log(`  ${a.email}: company ${a.person.company?.name ?? "(none)"} → Panameer`);
    }

    const pp = a.person.providerProfile;
    if (pp) {
      const c = pp._count;
      const hasContent =
        c.employers > 0 || c.packages > 0 || c.certifications > 0;
      if (hasContent && !force) {
        log(
          `  ! ${a.email} keeps a seeded provider profile with content ` +
            `(${c.employers} employers, ${c.packages} packages, ${c.certifications} certs).\n` +
            `    It is inert — the admin profile view is the employee type and the row\n` +
            `    is not marketplace-visible. Pass --force to delete it.`
        );
      } else {
        await prisma.providerProfile.delete({ where: { id: pp.id } });
        log(`  ${a.email}: removed the empty seeded provider profile (and its rates)`);
      }
    }
  }

  return admins.length;
}
