/**
 * ⚠⚠ RETIRED 2026-08-21 — DO NOT RUN THIS. IT REFUSES TO RUN, AND HERE IS WHY.
 *
 * Retired by Scott ("retire it.", 2026-08-20) in `brief_buyer_side_cleanup` WS1,
 * after CC found the hazard while landing `brief_company_binding_trap`
 * (`de808f7`). The `db:backfill-memberships` npm script is GONE; this file is
 * kept, renamed, and neutered.
 *
 * ── WHY IT IS KEPT AT ALL ────────────────────────────────────────────────────
 *
 * It really ran, and the 52 `CompanyMembership` rows in the database today came
 * from it and from the UI. Deleting the file would make those rows
 * unexplainable to whoever next asks where they came from. The original
 * reasoning is below, unedited, and it still reads well FOR THE DATABASE AS IT
 * WAS. It is the record of a migration, not a tool.
 *
 * ── ⚠ WHAT RUNNING IT TODAY WOULD DO — measured 2026-08-21 ───────────────────
 *
 * There are now 64 people who have a `Person.company_id` and NO membership.
 * `Person.company_id` is the SIGNUP PLACEHOLDER — every new Person gets one
 * whether or not that org is real to them (`P1-J1.2-E003`) — so this script
 * would:
 *
 *   · mint 64 memberships, every one of them status APPROVED, for people who
 *     never claimed any of those companies;
 *   · bind 51 of them to a single company called `Casey Fresh`, which has NO
 *     `tax_type` and no legal entity behind it (`P1-J1.2-E008`);
 *   · make the EARLIEST of them — Adaeze Okafor — its ADMIN, handing one person
 *     authority over 52 people's company by accident of signup order, including
 *     the power to approve and reject everyone else's join requests.
 *
 * ── ⚠ AND WHY THAT IS NOT A TUNING PROBLEM ───────────────────────────────────
 *
 * A membership is a HUMAN ATTESTATION — "I work here" — and the whole point of
 * `brief_company_binding_trap` is that it may only be created by a person
 * saying so, through `defineCompany` or `joinCompany`. Manufacturing one is the
 * exact act `check:company-binding` exists to prevent, and this file is that
 * guard's single named exception. There is no threshold at which minting 64 of
 * them becomes correct.
 *
 * ⚠ THE 64 ARE NOT A MESS TO CLEAN UP. `/company` is how they fix themselves,
 * by their own attestation (`P1-J1.2-E004`). That is the design, not a backlog.
 *
 * ── ⚠ IF YOU FOUND THIS FILE AND WANT WHAT IT DOES ───────────────────────────
 *
 * You want a person to be bound to a company. Send them to `/company`. If you
 * are migrating real, attested data from somewhere else, write a NEW script
 * that carries the attestation with it, and add it to `check:company-binding`
 * as a second named exception with its own reasoning — do not resurrect this
 * one, whose entire premise is that `Person.company_id` counts as consent.
 */

/*
  ⚠ THE REFUSAL IS THE FIRST STATEMENT THAT EXECUTES, ahead of every import that
  could open a connection and ahead of any query. Removing the npm script takes
  away the easy way to run this; it does not stop `npx tsx prisma/_retired_backfill-memberships.ts`,
  and somebody eventually will. A file that still executes is still a hazard.
*/
console.error(
  [
    "",
    "  ⚠ RETIRED — this backfill will not run.",
    "",
    "  It mints CompanyMembership rows from Person.company_id, which is the signup",
    "  placeholder, not a statement that anyone works anywhere. Running it today would",
    "  create 64 APPROVED memberships nobody asked for, put 51 of them on one untyped",
    "  company (Casey Fresh), and make one person ADMIN over 52 others by signup order.",
    "",
    "  A membership is an attestation. Send the person to /company instead.",
    "  See brief_buyer_side_cleanup WS1 and the block at the top of this file.",
    "",
  ].join("\n")
);
process.exit(1);

import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Backfill CompanyMembership for everyone who existed before it did
 * (brief_company_model WS1).
 *
 *   npm run db:backfill-memberships      ⚠ THAT SCRIPT NO LONGER EXISTS — retired 2026-08-21.
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
