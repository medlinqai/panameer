import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
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

  // --- Demo portfolio: Employers → Projects, Certifications, Packages ------
  // brief_S / E037. Idempotent: keyed on (profile, name) via findFirst-or-create,
  // since these have no natural unique across providers.
  const employerSpecs = [
    {
      name: "Acme Consulting",
      role_title: "Procurement Solution Architect",
      location: "Chicago, IL",
      start_date: new Date("2019-01-01"),
      end_date: null,
      is_current: true,
      description:
        "Lead architect on Oracle Cloud Procurement programs for global manufacturers.",
    },
    {
      name: "Globex Corp",
      role_title: "Senior Functional Consultant",
      location: "New York, NY",
      start_date: new Date("2015-03-01"),
      end_date: new Date("2018-12-01"),
      is_current: false,
      description:
        "Delivered Oracle Fusion Procurement for a $2B manufacturer.",
    },
  ];

  const employerIds: Record<string, string> = {};
  for (const spec of employerSpecs) {
    const found = await prisma.employer.findFirst({
      where: { provider_profile_id: providerProfile.id, name: spec.name },
      select: { id: true },
    });
    const row = found
      ? await prisma.employer.update({ where: { id: found.id }, data: spec })
      : await prisma.employer.create({
          data: { provider_profile_id: providerProfile.id, ...spec },
        });
    employerIds[spec.name] = row.id;
  }

  // brief_project_model_v2 — the demo projects carry the FULL v2 field set, so
  // the profile shows what a finished project actually looks like: a role, a
  // client (one of them confidential), tools, dates and a quantified outcome.
  const primaryRole =
    (await prisma.roleType.findFirst({
      where: { name: "Application-Specific" },
      select: { id: true },
    })) ?? (await prisma.roleType.findFirst({ orderBy: { sort_order: "asc" }, select: { id: true } }));

  /** Look up an industry from the INDUSTRY slice of the Specialization list. */
  const industryId = async (name: string) =>
    (
      await prisma.specialization.findFirst({
        where: { kind: "INDUSTRY", name: { contains: name, mode: "insensitive" } },
        select: { id: true },
      })
    )?.id ?? null;

  /** Resolve tool names to Application ids, skipping any the catalog lacks. */
  const appIds = async (names: string[]) => {
    const out: string[] = [];
    for (const n of names) {
      const row = await prisma.application.findFirst({
        where: { name: { equals: n, mode: "insensitive" } },
        select: { id: true },
      });
      if (row) out.push(row.id);
    }
    return out;
  };

  const projectSpecs = [
    {
      name: "Global P2P Transformation",
      employer: "Acme Consulting",
      description:
        "End-to-end Procure-to-Pay rollout across 14 countries — requisitions, sourcing, supplier portal and invoice automation.",
      sort_order: 10,
      clientName: "Northwind Industrials",
      clientVisibility: "PUBLIC" as const,
      codeName: null as string | null,
      industry: "Manufactur",
      startDate: new Date("2021-03-01"),
      endDate: new Date("2023-06-30"),
      isCurrent: false,
      tools: ["Requisitions", "Purchasing/Purchase Orders", "Supplier Portal", "Sourcing/Negotiations"],
      highlights: [
        "Rolled out Procure-to-Pay to 14 countries in 27 months.",
        "Replaced 6 legacy purchasing systems with Oracle Cloud Procurement.",
        "Trained 400+ requisitioners and 60 buyers across three regions.",
      ],
      outcomes: [
        { label: "Savings", value: "$10M+" },
        { label: "Countries", value: "14" },
        { label: "Cycle time", value: "-38%" },
      ],
      // brief_project_validation — the demo profile ships with ONE validated
      // project so the badge (and its "Confirmed May 2026" note) is visible
      // without walking the email loop. The other demo project deliberately
      // stays NONE so both states are on screen at once.
      validation: {
        contactEmail: "programme.director@northwind.example",
        sentAt: new Date("2026-05-04T09:00:00Z"),
        respondedAt: new Date("2026-05-12T14:20:00Z"),
      } as { contactEmail: string; sentAt: Date; respondedAt: Date } | null,
    },
    {
      name: "Supplier Onboarding Automation",
      employer: "Globex Corp",
      description:
        "Cut supplier onboarding cycle time by 40% with Oracle Supplier Qualification Management.",
      sort_order: 20,
      // The CONFIDENTIAL demo row: the card must show the code name and the
      // industry, never "Helios Energy".
      clientName: "Helios Energy",
      clientVisibility: "CONFIDENTIAL" as const,
      codeName: "Project Falcon",
      industry: "Energy",
      startDate: new Date("2023-09-01"),
      endDate: null as Date | null,
      isCurrent: true,
      tools: ["Supplier Portal", "Supplier Qualifications"],
      highlights: [
        "Automated supplier qualification across 3 business units.",
        "Integrated third-party risk screening into onboarding.",
      ],
      outcomes: [
        { label: "Onboarding time", value: "-40%" },
        { label: "Suppliers", value: "1,200" },
      ],
      validation: null as { contactEmail: string; sentAt: Date; respondedAt: Date } | null,
    },
  ];

  for (const spec of projectSpecs) {
    const data = {
      description: spec.description,
      sort_order: spec.sort_order,
      employer_id: employerIds[spec.employer] ?? null,
      role_type_id: primaryRole!.id,
      industry_specialization_id: await industryId(spec.industry),
      client_name: spec.clientName,
      contact_email: spec.validation?.contactEmail ?? null,
      // The seed is authoritative for demo state, so this is set either way —
      // otherwise a re-run after someone walked the loop would leave a mix.
      validation_status: spec.validation ? ("VALIDATED" as const) : ("NONE" as const),
      client_visibility: spec.clientVisibility,
      code_name: spec.codeName,
      start_date: spec.startDate,
      end_date: spec.endDate,
      is_current: spec.isCurrent,
      highlights: spec.highlights,
    };

    const found = await prisma.project.findFirst({
      where: { provider_profile_id: providerProfile.id, name: spec.name },
      select: { id: true },
    });
    const projectId = found
      ? (await prisma.project.update({ where: { id: found.id }, data })).id
      : (
          await prisma.project.create({
            data: {
              provider_profile_id: providerProfile.id,
              name: spec.name,
              ...data,
            },
          })
        ).id;

    // Children are REPLACED, not appended — the seed is idempotent and must not
    // grow a project's tool list every time it runs.
    const ids = await appIds(spec.tools);
    await prisma.projectApplication.deleteMany({ where: { project_id: projectId } });
    if (ids.length) {
      await prisma.projectApplication.createMany({
        data: ids.map((application_id) => ({ project_id: projectId, application_id })),
        skipDuplicates: true,
      });
    }
    await prisma.projectOutcome.deleteMany({ where: { project_id: projectId } });
    await prisma.projectOutcome.createMany({
      data: spec.outcomes.map((o, i) => ({
        project_id: projectId,
        label: o.label,
        value: o.value,
        sort_order: i * 10,
      })),
    });

    // The matching CONFIRMED request row. `responded_at` is what renders
    // "Confirmed May 2026" on the card, so it is a FIXED date — a `new Date()`
    // here would make the demo say something different every time it seeds.
    //
    // The token hash is derived deterministically so re-seeding updates one row
    // rather than piling up new ones. It is inert regardless: the request is
    // already CONFIRMED, so the confirm page reports it as answered and no raw
    // token for it has ever existed.
    await prisma.projectValidation.deleteMany({ where: { project_id: projectId } });
    if (spec.validation) {
      await prisma.projectValidation.create({
        data: {
          project_id: projectId,
          contact_email: spec.validation.contactEmail,
          token_hash: createHash("sha256")
            .update(`seed:project-validation:${projectId}`)
            .digest("hex"),
          status: "CONFIRMED",
          sent_at: spec.validation.sentAt,
          responded_at: spec.validation.respondedAt,
          expires_at: new Date(
            spec.validation.sentAt.getTime() + 30 * 24 * 60 * 60 * 1000
          ),
        },
      });
    }
  }

  // Certifications are standalone since brief_U / E044 — a credential belongs
  // to the person, not to whoever employed them when they earned it.
  const certSpecs = [
    {
      name: "Oracle Cloud Procurement Certified Implementation Professional",
      issuer: "Oracle",
      year: 2023,
    },
    {
      name: "Oracle Cloud Payables Certified Implementation Professional",
      issuer: "Oracle",
      year: 2021,
    },
  ];
  for (const spec of certSpecs) {
    const found = await prisma.certification.findFirst({
      where: { provider_profile_id: providerProfile.id, name: spec.name },
      select: { id: true },
    });
    const data = { issuer: spec.issuer, year: spec.year };
    if (found) {
      await prisma.certification.update({ where: { id: found.id }, data });
    } else {
      await prisma.certification.create({
        data: { provider_profile_id: providerProfile.id, name: spec.name, ...data },
      });
    }
  }

  // One PUBLISHED demo Package (brief_V) so the profile's catalog section has
  // something to render. Deliberately a single package: it's an illustration of
  // the shape, not a store. Idempotent on (profile, title).
  const packageSpec = {
    title: "Install DocuSign for Oracle Cloud",
    summary:
      "Integrate Oracle Cloud with DocuSign end to end: connected app, resource organization, and your contract admins onboarded and trained.",
    duration_weeks: 5,
    price_cents: 4_000_000,
    deliverables: [
      "Oracle Cloud ↔ DocuSign integration configured and tested",
      "DocuSign resource organization created",
      "Up to 5 contract administrators onboarded",
      "Signature templates for standard contract types",
      "Runbook and 30 days of post-go-live support",
    ],
    milestones: [
      { label: "Upfront", percent: 50, sequence: 0 },
      { label: "On completion", percent: 50, sequence: 1 },
    ],
  };
  const existingPackage = await prisma.package.findFirst({
    where: { provider_profile_id: providerProfile.id, title: packageSpec.title },
    select: { id: true },
  });
  if (!existingPackage) {
    await prisma.package.create({
      data: {
        provider_profile_id: providerProfile.id,
        title: packageSpec.title,
        summary: packageSpec.summary,
        duration_weeks: packageSpec.duration_weeks,
        price_cents: packageSpec.price_cents,
        status: "PUBLISHED",
        deliverables: {
          create: packageSpec.deliverables.map((text, sequence) => ({
            text,
            sequence,
          })),
        },
        milestones: { create: packageSpec.milestones },
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

  // A couple of employers with nested projects (brief_U / E042 — Employer is
  // the one work-history model). Idempotent guard: only seed when absent.
  const ceresExists = await prisma.employer.findFirst({
    where: { provider_profile_id: providerProfile.id, name: "Ceres Holdings" },
    select: { id: true },
  });
  if (!ceresExists) {
    await prisma.employer.create({
      data: {
        provider_profile_id: providerProfile.id,
        name: "Ceres Holdings",
        role_title: "Lead Oracle Cloud Procurement Consultant",
        description:
          "Owned the end-to-end Procurement Cloud implementation and rollout.",
        sort_order: 20,
        projects: {
          create: [
            {
              provider_profile_id: providerProfile.id,
              name: "Self-Service Procurement rollout",
              description: "Requisition-to-receipt across 12 sites.",
              role_type_id: primaryRole!.id,
              client_name: "Ceres Holdings",
              start_date: new Date("2019-02-01"),
              end_date: new Date("2020-11-30"),
            },
            {
              provider_profile_id: providerProfile.id,
              name: "Supplier Portal onboarding",
              description: "Migrated 400+ suppliers to the Supplier Portal.",
              role_type_id: primaryRole!.id,
              client_name: "Ceres Holdings",
              start_date: new Date("2020-01-15"),
              end_date: new Date("2020-12-31"),
            },
          ],
        },
      },
    });
    await prisma.employer.create({
      data: {
        provider_profile_id: providerProfile.id,
        name: "Global Retail Co.",
        role_title: "Oracle Sourcing Specialist",
        description: "Sourcing and negotiations optimization.",
        sort_order: 30,
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
        employers: true,
        education: true,
        languages: true,
        certifications: true,
        person: {
          select: {
            photo_url: true,
            phone: true,
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
        work_method: full.work_method,
        pillar_id: full.pillar_id,
        role_type_id: full.role_type_id,
        onsite_rate_cents: full.onsite_rate_cents,
        remote_rate_cents: full.remote_rate_cents,
        hourly_rate_cents: full.hourly_rate_cents,
        skills: full.skills,
        languages: full.languages,
        employers: full.employers,
        education: full.education,
        certifications: full.certifications,
        specializations: full.specializations,
        photoUrl: full.person.photo_url,
        date_of_birth: full.date_of_birth,
        hasAddress: Boolean(full.person.site?.addresses?.[0]?.line1?.trim()),
        hasPhone: Boolean(full.person.phone?.trim()),
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
