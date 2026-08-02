import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Make the Panameer Admin a Panameer EMPLOYEE (WS7 / E003, E004, E006, E007).
 *
 *   npm run fix:admin
 *
 * The seed builds the admin as a member of the demo org "Ceres Holdings" and
 * gives them a provider profile with $90/$125 rates, because the demo backbone
 * and the admin login were created in one pass. That made the platform operator
 * look like a customer: wrong company in the rail (E007), a résumé-shaped
 * profile with rates they don't charge (E004/E006), and a membership badge
 * reading "Recruiter Basic" (E003).
 *
 * A Panameer Admin is an employee performing setup — patterned after Medlinq's
 * MEDLINQ_ADMIN — so they get their own P-Account and Company ("Panameer"), and
 * the provider artefacts come off.
 *
 * IDEMPOTENT and NARROW: it acts only on users carrying is_system_admin, and it
 * DELETES a provider profile only when that profile has no real content — no
 * employers, no packages, no certifications. An admin who genuinely also sells
 * on the platform keeps theirs, and is reported instead.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const admins = await prisma.user.findMany({
    where: { is_system_admin: true },
    select: {
      id: true,
      email: true,
      person: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          company: { select: { id: true, name: true } },
          providerProfile: {
            select: {
              id: true,
              _count: { select: { employers: true, packages: true, certifications: true } },
            },
          },
        },
      },
    },
  });

  if (admins.length === 0) {
    console.log("No system admins found.");
    return;
  }

  // One Panameer P-Account → Company that every admin belongs to.
  const existing = await prisma.company.findFirst({
    where: { name: "Panameer" },
    select: { id: true },
  });

  let companyId = existing?.id ?? null;
  {
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
      console.log("created the Panameer company");
    }
  }

  const site = await prisma.site.findFirst({
    where: { company_id: companyId! },
    select: { id: true },
  });

  for (const a of admins) {
    if (!a.person) {
      console.log(`  ! ${a.email} has no Person — skipped`);
      continue;
    }

    const moved = a.person.company?.name !== "Panameer";
    await prisma.person.update({
      where: { id: a.person.id },
      data: {
        company_id: companyId!,
        ...(site ? { site_id: site.id } : {}),
        // An employee is none of the marketplace actors. This is what makes the
        // badge stop reading "Recruiter Basic".
        is_service_provider: false,
        is_service_buyer: false,
        is_service_coordinator: false,
        is_support: true,
      },
    });
    if (moved) {
      console.log(
        `  ${a.email}: company ${a.person.company?.name ?? "(none)"} → Panameer`
      );
    }

    const pp = a.person.providerProfile;
    if (pp) {
      const c = pp._count;
      const hasContent = c.employers > 0 || c.packages > 0 || c.certifications > 0;
      if (hasContent && !process.argv.includes("--force")) {
        console.log(
          `  ! ${a.email} has a provider profile WITH content ` +
            `(${c.employers} employers, ${c.packages} packages, ${c.certifications} certs) — left alone.\n` +
            `    The admin PROFILE VIEW is the employee type regardless, so this row is\n` +
            `    invisible in the app. Pass --force to delete it if it is seed noise.`
        );
      } else {
        await prisma.providerProfile.delete({ where: { id: pp.id } });
        console.log(`  ${a.email}: removed the empty seeded provider profile (and its rates)`);
      }
    }
  }

  console.log(`\ndone — ${admins.length} admin(s) checked`);
  await prisma.$disconnect();
}

void main();
