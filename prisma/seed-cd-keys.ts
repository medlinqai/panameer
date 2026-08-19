import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { P2P_DOMAINS as BANK } from "@/lib/assessment/questions-p2p";
import { P2P_DOMAINS as ADVERTISED } from "@/lib/capability-domains";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * BACKFILL `CapabilityDomain.key` FOR PROCURE-TO-PAY, AND SEED THE TWO MISSING ROWS (E004).
 *
 * ⚠ THE MAPPING FROM AN EXISTING ROW TO A KEY IS BY NAME, ONCE, HERE — and that is the only
 * place a name is ever allowed to act as an identifier. The table was seeded from
 * `Service Catalog.xlsx` with the ADVERTISED phrasing ("Requisitioning & Demand
 * Management") while the bank says "Request and Demand Management", so the first assignment
 * has to bridge the two somehow. After this runs, everything joins on `key` and no consumer
 * ever looks at a name again.
 *
 * ⚠ ORDER-BASED PAIRING, NOT FUZZY NAME MATCHING. `capability-domains.ts` and
 * `questions-p2p.ts` list the same ten domains in the same order — that is asserted below
 * before anything is written — so advertised[i] and bank[i] are the same domain. The
 * advertised NAME is what the table holds, and the bank KEY is what it should carry. A
 * string-similarity match would have been a guess; an asserted index is not.
 *
 * Idempotent: keys are set by name, and the two missing rows are upserted on
 * `[process, name]`.
 */
const PROCESS = "Procure-to-Pay";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  try {
    /* ── the pairing precondition, asserted before any write ─────────────────── */
    if (ADVERTISED.length !== BANK.length) {
      throw new Error(
        `the advertised list (${ADVERTISED.length}) and the bank (${BANK.length}) disagree on how many P2P domains there are — pairing by index is unsafe, resolve that first`
      );
    }
    ADVERTISED.forEach((a, i) => {
      if (a.id !== BANK[i].key) {
        throw new Error(
          `advertised[${i}].id "${a.id}" != bank[${i}].key "${BANK[i].key}" — the two lists are no longer in the same order, so index pairing is unsafe`
        );
      }
    });
    console.log(`  precondition: the two lists agree on order and key for all ${BANK.length} domains ✓`);

    let keyed = 0;
    let created = 0;
    for (let i = 0; i < BANK.length; i++) {
      const key = BANK[i].key;
      const advertisedName = ADVERTISED[i].name;
      /* the row as the catalog seeded it, found by the name the catalog used */
      const existing = await prisma.capabilityDomain.findFirst({
        where: { process: PROCESS, name: advertisedName },
        select: { id: true, key: true },
      });
      if (existing) {
        if (existing.key !== key) {
          await prisma.capabilityDomain.update({ where: { id: existing.id }, data: { key } });
          keyed++;
        }
      } else {
        /*
          ⚠ THE TWO DOMAINS ADDED AT E034 HAVE NO CATALOG ROW — Data Analytics & AI
          Governance and Change Management & AI Adoption were authored into the bank from
          Scott's deck and never existed in `Service Catalog.xlsx`. Seeded with the ADVERTISED
          name, because that is the phrasing every other row in this table uses.
        */
        await prisma.capabilityDomain.create({
          data: { process: PROCESS, name: advertisedName, key, sort_order: 100 + i },
        });
        created++;
      }
    }
    console.log(`  keys written: ${keyed}   rows created: ${created}`);

    /* ── report + the assertion the brief demands ────────────────────────────── */
    const rows = await prisma.capabilityDomain.findMany({
      where: { process: PROCESS },
      orderBy: { sort_order: "asc" },
      select: { key: true, name: true },
    });
    console.log(`\n  Procure-to-Pay rows (${rows.length}):`);
    rows.forEach((r) => console.log(`    ${(r.key ?? "(no key)").padEnd(20)} ${r.name}`));

    console.log("\n  ⚠ every bank key resolves to EXACTLY ONE row:");
    let bad = 0;
    for (const d of BANK) {
      const n = await prisma.capabilityDomain.count({ where: { process: PROCESS, key: d.key } });
      if (n !== 1) bad++;
      console.log(`    ${d.key.padEnd(20)} ${n} row(s) ${n === 1 ? "✓" : "✗"}`);
    }
    if (bad) throw new Error(`${bad} bank key(s) do not resolve to exactly one row`);

    const perProcess = await prisma.capabilityDomain.groupBy({ by: ["process"], _count: true });
    console.log("\n  rows per process:");
    perProcess
      .sort((a, b) => a.process.localeCompare(b.process))
      .forEach((p) => console.log(`    ${String(p._count).padStart(3)}  ${p.process}`));
    const keyed_total = await prisma.capabilityDomain.count({ where: { key: { not: null } } });
    const total = await prisma.capabilityDomain.count();
    console.log(
      `\n  ${keyed_total} of ${total} domains carry a key — only Procure-to-Pay has an authored assessment bank, so only it has keys. The rest stay NULL rather than carrying invented ones.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
