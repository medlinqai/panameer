import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { seedTaxonomy } from "./seed-taxonomy";

/*
  Same bootstrap as `seed.ts`: the pg adapter needs DATABASE_URL at construction
  time, and ts-node does not read .env.local on its own — without this it falls
  back to localhost:5432 and fails with a connection error that looks nothing
  like the missing-env it actually is.
*/
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * Reseed the SERVICE CATALOG only (brief_seed_ai_catalog).
 *
 * `npm run seed` also creates the admin user, the Learn curriculum and the
 * whole demo org. Adding one role to the taxonomy should not require running
 * any of that — on a populated environment it is a lot of write traffic to
 * achieve a nine-skill change, and every extra thing touched is another thing
 * that can go wrong on a database with real data in it.
 *
 * `seedTaxonomy` is fully idempotent: every write is an upsert keyed on a
 * natural unique, and its retirement pass only removes rows the JSON no longer
 * contains. Adding a role therefore touches nothing that already exists, and
 * re-running it is a no-op.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    const counts = await seedTaxonomy(prisma);
    console.log("Service catalog:", JSON.stringify(counts, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
