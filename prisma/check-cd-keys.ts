import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { P2P_DOMAINS as BANK } from "@/lib/assessment/questions-p2p";
import { P2P_DOMAINS as ADVERTISED } from "@/lib/capability-domains";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * ⚠ THE JOIN THE WHOLE VALUE MODEL DEPENDS ON — ASSERTED, NOT EYEBALLED (E004).
 *
 * Products are indexed by `capability_domain_id` and a buyer's answers are keyed by the
 * assessment bank's `key`. If a bank key does not resolve to exactly one row, a roadmap line
 * cannot reach the products written for it, and the failure is silent: an empty result looks
 * identical to "no products yet".
 *
 * Needs the database, so it is its own check rather than part of the static
 * `check:catalog-value`.
 */
let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail === undefined ? "" : " → " + JSON.stringify(detail)}`); }
};

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  try {
    console.log("\n=== every assessment-bank key resolves to exactly one row ===");
    for (const d of BANK) {
      const n = await prisma.capabilityDomain.count({
        where: { process: "Procure-to-Pay", key: d.key },
      });
      check(`${d.key} → 1 row`, n === 1, n);
    }

    console.log("\n=== the three lists agree on KEY (never on name) ===");
    check(
      "the advertised list uses the bank's keys as its ids",
      ADVERTISED.map((a) => a.id).join(",") === BANK.map((b) => b.key).join(","),
      { advertised: ADVERTISED.map((a) => a.id), bank: BANK.map((b) => b.key) }
    );
    const rows = await prisma.capabilityDomain.findMany({
      where: { process: "Procure-to-Pay" },
      select: { key: true, name: true },
    });
    check("Procure-to-Pay has one row per bank domain", rows.length === BANK.length, rows.length);
    check(
      "every Procure-to-Pay row carries a key",
      rows.every((r) => r.key),
      rows.filter((r) => !r.key).map((r) => r.name)
    );
    /*
      ⚠ ASSERTS THE NAMES STILL DIFFER. That is not pedantry: if someone "tidies" the three
      lists into one phrasing, the next person will reasonably start joining on name again
      and this whole defect returns. The divergence is the reminder that the key is the join.
    */
    const bankNames = new Set(BANK.map((b) => b.name));
    check(
      "names still differ between the bank and the table — the key is the join, by design",
      rows.some((r) => !bankNames.has(r.name!)),
      rows.map((r) => r.name)
    );

    console.log("\n=== no key is duplicated within a process ===");
    const dupes = await prisma.$queryRawUnsafe<{ process: string; key: string; n: bigint }[]>(
      `select process, key, count(*)::bigint as n from capability_domains
       where key is not null group by process, key having count(*) > 1`
    );
    check("zero duplicate (process, key) pairs", dupes.length === 0, dupes);

    console.log("\n=== keys exist only where a bank does ===");
    const keyed = await prisma.capabilityDomain.count({ where: { key: { not: null } } });
    const total = await prisma.capabilityDomain.count();
    check(
      `${keyed} of ${total} carry a key — only Procure-to-Pay, which is the only authored bank`,
      keyed === BANK.length,
      { keyed, expected: BANK.length }
    );

    console.log(`\n${pass} passed, ${fail} failed`);
    if (fail) process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
