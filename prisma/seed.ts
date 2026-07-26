import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";
import { seedTaxonomy } from "./seed-taxonomy";
import { computeProviderCompleteness } from "../src/lib/completeness";
import { normalizeEmail } from "../src/lib/normalizeEmail";

// Load .env.local so `npm run seed` (bare ts-node, bypassing prisma.config.ts)
// sees DATABASE_URL. Without this the pg adapter falls back to localhost:5432
// and fails with ECONNREFUSED.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // SEED_ADMIN_EMAIL is hand-typed into .env.local — normalize it like every
  // other email entry point (brief_O), or a capitalized value seeds a row the
  // login lookup can never find.
  const email = normalizeEmail(
    process.env.SEED_ADMIN_EMAIL ?? "admin@panameer.com"
  );
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  const password_hash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    // brief_K: verify the demo admin's email so its provider profile is ACTIVE.
    update: { email_verified: new Date() },
    create: {
      email,
      password_hash,
      first_name: "Panameer",
      last_name: "Admin",
      role: "ADMIN",
      is_system_admin: true,
      email_verified: new Date(),
    },
  });

  console.log(`Seeded admin user: ${admin.email}`);

  // --- ERP service-catalog taxonomy (reference data) ---------------------
  // Seeded before profiles so provider skills can reference the taxonomy.
  const counts = await seedTaxonomy(prisma);
  console.log("Seeded service catalog:", JSON.stringify(counts));

  // --- Demo org: PAccount → Company → Site → Address → Person -------------
  // Guarded on the admin Person's user_id (unique) so the whole backbone is
  // created once; re-runs reuse it.
  let adminPerson = await prisma.person.findUnique({
    where: { user_id: admin.id },
    include: { company: true, site: true },
  });

  if (!adminPerson) {
    const pAccount = await prisma.pAccount.create({
      data: {
        kind: "BOTH",
        name: "Panameer Demo Org",
        status: "ACTIVE",
        companies: {
          create: {
            name: "Ceres Holdings",
            vertical: "Enterprise Procurement",
            website: "https://example.com",
            sites: {
              create: {
                name: "NYC HQ",
                open_for_business: true,
                addresses: {
                  create: {
                    line1: "123 Main St",
                    city: "New York",
                    state: "NY",
                    postal_code: "10001",
                    country: "US",
                  },
                },
              },
            },
          },
        },
      },
      include: { companies: { include: { sites: true } } },
    });

    const company = pAccount.companies[0];
    const site = company.sites[0];

    // Link the admin User to a Person in the demo org. The admin is a Service
    // Provider (and coordinator/support) for the demo.
    adminPerson = await prisma.person.create({
      data: {
        company_id: company.id,
        site_id: site.id,
        user_id: admin.id,
        first_name: admin.first_name ?? "Panameer",
        last_name: admin.last_name ?? "Admin",
        title: "Oracle Cloud P2P / Procurement Cloud Expert",
        photo_url: null,
        status: "ACTIVE",
        is_service_provider: true,
        is_service_coordinator: true,
        is_support: true,
      },
      include: { company: true, site: true },
    });

    console.log(
      `Seeded demo org: ${pAccount.name} → ${company.name} → ${site.name}; ` +
        `linked admin to Person ${adminPerson.first_name} ${adminPerson.last_name}.`
    );
  } else {
    console.log("Demo org already present (admin already linked); reusing.");
  }

  const company = adminPerson.company;

  // Ensure the admin Person's actor flags + title are correct even on reuse —
  // the flag rename (db push) drops the old columns, so re-assert them here.
  adminPerson = await prisma.person.update({
    where: { id: adminPerson.id },
    data: {
      title: "Oracle Cloud P2P / Procurement Cloud Expert",
      is_service_provider: true,
      is_service_coordinator: true,
      is_support: true,
    },
    include: { company: true, site: true },
  });

  // --- Demo Service Provider profile (on the admin Person) ----------------
  // Idempotent: upsert on person_id (unique). Modeled on the mockup persona.
  const americas = await prisma.region.findUnique({
    where: { name: "Americas" },
  });

  // The demo provider's field = the (Role, Domain) pair its skills live under
  // (brief_R). Without both, the step-7 prune would strip its skills as
  // "outside the chosen field".
  const demoRole = await prisma.roleType.findUnique({
    where: { code: "APPLICATION_SPECIFIC" },
  });
  const demoDomain = await prisma.pillar.findFirst({
    where: { name: "Finance & Accounting" },
  });

  const providerProfile = await prisma.providerProfile.upsert({
    where: { person_id: adminPerson.id },
    // Re-assert the brief_K demo state on existing rows (the schema rename reset
    // status/validation to their defaults).
    update: {
      status: "ACTIVE",
      validation_status: "VALIDATED",
      validated_at: new Date(),
      role_type_id: demoRole?.id ?? null,
      pillar_id: demoDomain?.id ?? null,
      hourly_rate_cents: 12500,
    },
    create: {
      person_id: adminPerson.id,
      region_id: americas?.id ?? null,
      role_type_id: demoRole?.id ?? null,
      pillar_id: demoDomain?.id ?? null,
      hourly_rate_cents: 12500,
      headline: "Oracle Cloud P2P / Procurement Cloud Expert",
      overview:
        "15+ years implementing Oracle Cloud Procurement and Payables. " +
        "Led P2P transformations across manufacturing and retail — " +
        "requisitions, sourcing, supplier portal, and self-service procurement.",
      experience_level: "EXPERT",
      goal: "MAIN_HUSTLE",
      work_types: ["HOURLY", "PACKAGES"],
      onsite_rate_cents: 12500,
      remote_rate_cents: 9000,
      currency: "USD",
      rating: "4.90",
      // brief_K: active-on-verify (admin email is verified below), and a
      // Validated demo so the badge is visible in the running app. Completeness
      // is recomputed at the end of this block from the actual data.
      status: "ACTIVE",
      validation_status: "VALIDATED",
      validated_at: new Date(),
    },
  });

  // Demo specializations (brief_R) — a realistic multi-select for the preview.
  const demoSpecializations = await prisma.specialization.findMany({
    where: { name: { in: ["Oracle Cloud", "Procure-to-Pay", "Source-to-Pay"] } },
    select: { id: true },
  });
  for (const sp of demoSpecializations) {
    await prisma.providerProfileSpecialization.upsert({
      where: {
        provider_profile_id_specialization_id: {
          provider_profile_id: providerProfile.id,
          specialization_id: sp.id,
        },
      },
      update: {},
      create: {
        provider_profile_id: providerProfile.id,
        specialization_id: sp.id,
      },
    });
  }

  // Finish-page fields (brief_P / E019) so the demo scores the identity block.
  await prisma.providerProfile.update({
    where: { id: providerProfile.id },
    data: { work_method: "HOURLY", date_of_birth: new Date("1985-04-12") },
  });
  await prisma.person.update({
    where: { id: adminPerson.id },
    data: { phone: "+15550104477", phone_verified_at: new Date() },
  });

  // Tag Procurement skills (idempotent via the unique join key). Match the
  // seeded taxonomy by name.
  const procurementSkillNames = [
    "Requisitions",
    "Purchasing/Purchase Orders",
    "Sourcing/Negotiations",
    "Supplier Portal",
  ];
  const procurementSkills = await prisma.skill.findMany({
    where: {
      name: { in: procurementSkillNames },
      // Scope to the demo's (Role, Domain): a skill name can now exist under
      // more than one pair, so a name-only match is ambiguous (brief_R).
      role_type_id: demoRole?.id,
      pillar_id: demoDomain?.id,
    },
    select: { id: true },
  });
  for (const skill of procurementSkills) {
    await prisma.providerSkill.upsert({
      where: {
        provider_profile_id_skill_id: {
          provider_profile_id: providerProfile.id,
          skill_id: skill.id,
        },
      },
      update: {},
      create: {
        provider_profile_id: providerProfile.id,
        skill_id: skill.id,
      },
    });
  }

  // A couple of work experiences (idempotent guard: only seed if none exist).
  const existingExperience = await prisma.workExperience.count({
    where: { provider_profile_id: providerProfile.id },
  });
  if (existingExperience === 0) {
    await prisma.workExperience.create({
      data: {
        provider_profile_id: providerProfile.id,
        employer: "Ceres Holdings",
        role_title: "Lead Oracle Cloud Procurement Consultant",
        description:
          "Owned the end-to-end Procurement Cloud implementation and rollout.",
        projects: {
          create: [
            {
              name: "Self-Service Procurement rollout",
              description: "Requisition-to-receipt across 12 sites.",
            },
            {
              name: "Supplier Portal onboarding",
              description: "Migrated 400+ suppliers to the Supplier Portal.",
            },
          ],
        },
      },
    });
    await prisma.workExperience.create({
      data: {
        provider_profile_id: providerProfile.id,
        employer: "Global Retail Co.",
        role_title: "Oracle Sourcing Specialist",
        description: "Sourcing and negotiations optimization.",
      },
    });
  }

  // Recompute the demo provider's completeness from the actual data (brief_K),
  // using the same pure helper the app uses — so it reaches the 80% bar and is
  // marketplace-visible.
  {
    const full = await prisma.providerProfile.findUnique({
      where: { id: providerProfile.id },
      include: {
        skills: true,
        specializations: true,
        workExperiences: true,
        education: true,
        languages: true,
        certifications: true,
        person: {
          select: {
            photo_url: true,
            phone_verified_at: true,
            site: { select: { addresses: { select: { line1: true }, take: 1 } } },
          },
        },
      },
    });
    if (full) {
      const completeness = computeProviderCompleteness({
        headline: full.headline,
        overview: full.overview,
        experience_level: full.experience_level,
        goal: full.goal,
        work_method: full.work_method,
        pillar_id: full.pillar_id,
        role_type_id: full.role_type_id,
        onsite_rate_cents: full.onsite_rate_cents,
        remote_rate_cents: full.remote_rate_cents,
        hourly_rate_cents: full.hourly_rate_cents,
        skills: full.skills,
        languages: full.languages,
        workExperiences: full.workExperiences,
        education: full.education,
        certifications: full.certifications,
        specializations: full.specializations,
        photoUrl: full.person.photo_url,
        date_of_birth: full.date_of_birth,
        hasAddress: Boolean(full.person.site?.addresses?.[0]?.line1?.trim()),
        phoneVerified: full.person.phone_verified_at != null,
      });
      await prisma.providerProfile.update({
        where: { id: providerProfile.id },
        data: { completeness },
      });
    }
  }

  // --- Demo Service Buyer (a second Person in the demo Company) -----------
  // Idempotent: keyed on (company, name) since Person has no email.
  let buyerPerson = await prisma.person.findFirst({
    where: {
      company_id: company.id,
      first_name: "Neisha",
      last_name: "Buyer",
    },
  });
  if (!buyerPerson) {
    buyerPerson = await prisma.person.create({
      data: {
        company_id: company.id,
        first_name: "Neisha",
        last_name: "Buyer",
        title: "Procurement Manager",
        status: "ACTIVE",
        is_service_buyer: true,
      },
    });
  }
  await prisma.buyerProfile.upsert({
    where: { person_id: buyerPerson.id },
    update: {},
    create: {
      person_id: buyerPerson.id,
      subscription_tier: "BASIC",
    },
  });

  // --- Demo Service Coordinator (own PAccount/Company, loginable) ----------
  // Coordinator onboarding isn't built yet (deferred), so seed one so the
  // invite tooling (brief_I) has an owner to test with. Idempotent on email.
  const coordinatorEmail = "coordinator@panameer.com";
  let coordinatorUser = await prisma.user.findUnique({
    where: { email: coordinatorEmail },
  });
  if (!coordinatorUser) {
    const coordPassword = await bcrypt.hash(
      process.env.SEED_COORDINATOR_PASSWORD ?? password,
      10
    );
    coordinatorUser = await prisma.user.create({
      data: {
        email: coordinatorEmail,
        password_hash: coordPassword,
        first_name: "Ramesh",
        last_name: "Coordinator",
        role: "MEMBER",
        email_verified: new Date(),
      },
    });
    const coordAccount = await prisma.pAccount.create({
      data: {
        kind: "PROVIDER",
        name: "Ramesh Coordinator",
        status: "ACTIVE",
        companies: { create: { name: "Ramesh Coordinator" } },
      },
      include: { companies: true },
    });
    await prisma.person.create({
      data: {
        company_id: coordAccount.companies[0].id,
        user_id: coordinatorUser.id,
        first_name: "Ramesh",
        last_name: "Coordinator",
        title: "Service Coordinator",
        status: "ACTIVE",
        is_service_coordinator: true,
      },
    });
  }

  console.log(
    `Seeded demo provider (profile ${providerProfile.id}, ` +
      `${procurementSkills.length} skills), demo buyer ` +
      `(${buyerPerson.first_name} ${buyerPerson.last_name}), and coordinator ` +
      `(${coordinatorEmail}).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
