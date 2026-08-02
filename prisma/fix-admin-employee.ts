import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { makeAdminsEmployees } from "./admin-employee";

/**
 * Make the Panameer Admin a Panameer EMPLOYEE (WS5 / E003, E004, E006, E007).
 *
 *   npm run fix:admin              normalize
 *   npm run fix:admin -- --force   also delete a content-bearing provider profile
 *
 * The work lives in `admin-employee.ts` because the SEED runs it too — the seed
 * is what creates the provider artefacts in the first place, so a one-off
 * cleanup script would be undone by the next `npm run seed`.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const n = await makeAdminsEmployees(prisma, {
    force: process.argv.includes("--force"),
  });
  console.log(`\ndone — ${n} admin(s) checked`);
  await prisma.$disconnect();
}

void main();
