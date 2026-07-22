import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
