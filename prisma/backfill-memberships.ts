import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Backfill CompanyMembership for everyone who existed before it did
 * (brief_company_model WS1).
 *
 *   npm run db:backfill-memberships
 *
 * Membership is the identity primitive as of this brief, and the gate in WS4
 * reads it. Every Person already sat on a Company via `Person.company_id` —
 * that binding was real, it just wasn't recorded as a decision — so this writes
 * the row that says so rather than locking the whole demo cast out of a product
 * they were already using.
 *
 * WHO BECOMES ADMIN: the earliest person in each company. Someone has to be
 * able to approve joiners and accept the company terms, and on a
 * one-person-per-company dev database that is the person themselves. It is a
 * judgement call on historical data, so it is here in a script Scott can read
 * rather than buried in application code.
 *
 * WHAT IT DOES NOT DO: accept the company ToS on anyone's behalf. That is an
 * agreement, not a data migration — companies are left un-accepted and their
 * admin is prompted on the company page.
 *
 * Idempotent: existing memberships are left exactly as they are.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      people: {
        orderBy: { created_at: "asc" },
        select: { id: true, first_name: true, last_name: true },
      },
      memberships: { select: { person_id: true, role: true } },
    },
  });

  let created = 0;
  let admins = 0;

  for (const c of companies) {
    if (c.people.length === 0) continue;
    const have = new Set(c.memberships.map((m) => m.person_id));
    const hasAdmin = c.memberships.some((m) => m.role === "ADMIN");

    for (const [i, p] of c.people.entries()) {
      if (have.has(p.id)) continue;
      const makeAdmin = !hasAdmin && i === 0;
      await prisma.companyMembership.create({
        data: {
          person_id: p.id,
          company_id: c.id,
          role: makeAdmin ? "ADMIN" : "MEMBER",
          status: "APPROVED",
          // No attestation: nobody was ever asked. Recording one would be
          // inventing a statement a person never made.
          decided_at: new Date(),
        },
      });
      created += 1;
      if (makeAdmin) admins += 1;
    }
  }

  console.log(
    `backfilled ${created} membership(s) across ${companies.length} companies (${admins} admin).`
  );
  const pending = await prisma.company.count({
    where: { company_tos_accepted_at: null, people: { some: {} } },
  });
  console.log(
    `${pending} company/companies have not accepted the company terms — ` +
      `their admin is prompted on /company. Not auto-accepted on purpose.`
  );
  await prisma.$disconnect();
}

void main();
