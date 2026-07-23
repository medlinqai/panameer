import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";
import { seedTaxonomy } from "./seed-taxonomy";

// Load .env.local so `npm run seed` (bare ts-node, bypassing prisma.config.ts)
// sees DATABASE_URL. Without this the pg adapter falls back to localhost:5432
// and fails with ECONNREFUSED.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@panameer.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  const password_hash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password_hash,
      first_name: "Panameer",
      last_name: "Admin",
      role: "ADMIN",
      is_system_admin: true,
    },
  });

  console.log(`Seeded admin user: ${admin.email}`);

  // --- Demo org: PAccount → Company → Site → Address → Person -------------
  // One nested create builds the whole backbone. Guarded on the Person's
  // user_id (unique) so re-running the seed is idempotent — if the admin is
  // already linked to a Person, we skip rather than duplicate the org.
  const existingPerson = await prisma.person.findUnique({
    where: { user_id: admin.id },
    select: { id: true },
  });

  if (existingPerson) {
    console.log("Demo org already present (admin already linked); skipping.");
  } else {
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

    // Link the admin User to a Person in the demo org.
    const person = await prisma.person.create({
      data: {
        company_id: company.id,
        site_id: site.id,
        user_id: admin.id,
        first_name: admin.first_name ?? "Panameer",
        last_name: admin.last_name ?? "Admin",
        title: "System Administrator",
        status: "ACTIVE",
        is_buyer: true,
        is_provider: true,
        is_coordinator: true,
        is_support: true,
      },
    });

    console.log(
      `Seeded demo org: ${pAccount.name} → ${company.name} → ${site.name}; ` +
        `linked admin to Person ${person.first_name} ${person.last_name}.`
    );
  }

  // --- ERP service-catalog taxonomy (reference data) ---------------------
  const counts = await seedTaxonomy(prisma);
  console.log("Seeded ERP taxonomy:", JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
