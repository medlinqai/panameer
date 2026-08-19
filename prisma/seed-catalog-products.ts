import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";

/*
  Same bootstrap as `seed-catalog.ts`: the pg adapter needs DATABASE_URL at construction
  time and ts-node/esbuild do not read .env.local on their own — without this it falls back
  to localhost:5432 and fails with a connection error that looks nothing like the
  missing-env it actually is.
*/
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * SEED FOR `PackageCapabilityDomain` + `PackageValueFactor` (brief_product_domain_and_value).
 *
 * ⚠ ITS ONLY JOB IS TO PROVE THE TWO SHAPES the brief asked for, on real rows:
 *   1. one package linked to SEVERAL capability domains
 *   2. one package carrying TWO value factors — one proportional, one FLAT
 *
 * ⚠ NOTHING READS THIS YET. No scoring change, no dashboard change, no UI. Whether these
 * factors replace, feed or reconcile against the top-down `DOLLAR_WEIGHTS` model is an open
 * decision and was explicitly out of scope.
 *
 * ⚠ FULLY IDEMPOTENT. Packages are matched on (provider, title) and updated in place; the
 * domain links are upserted on their composite unique; the factors are deleted and rewritten
 * for these two packages ONLY, because a factor has no natural key and re-running should not
 * accumulate duplicates. Nothing outside the two seeded packages is touched.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    const provider = await prisma.providerProfile.findFirst({ select: { id: true } });
    if (!provider) throw new Error("no ProviderProfile to attach seed packages to — run `npm run seed` first");

    /*
      ⚠ THE DOMAINS COME FROM THE DB, NOT FROM `questions-p2p.ts`. The FK points at
      `capability_domains`, which is seeded from `Service Catalog.xlsx` and uses the
      ADVERTISED naming ("Requisitioning & Demand Management"). The assessment bank uses the
      deck's naming ("Request and Demand Management"), so seven of its ten names have no row
      here. That gap is real and is reported by this brief rather than papered over — see the
      note at the foot of this file.
    */
    const p2p = await prisma.capabilityDomain.findMany({
      where: { process: "Procure-to-Pay" },
      orderBy: { sort_order: "asc" },
      select: { id: true, name: true },
    });
    if (p2p.length < 2) throw new Error("expected several Procure-to-Pay capability domains");

    const upsertPackage = async (title: string, summary: string) => {
      const found = await prisma.package.findFirst({
        where: { provider_profile_id: provider.id, title },
        select: { id: true },
      });
      if (found) {
        await prisma.package.update({ where: { id: found.id }, data: { summary } });
        return found.id;
      }
      const made = await prisma.package.create({
        data: { provider_profile_id: provider.id, title, summary, pricing_type: "FIXED" },
        select: { id: true },
      });
      return made.id;
    };

    /* ── SHAPE 1: one package, MANY domains ─────────────────────────────────────
       Scott's case for many-to-many, verbatim: "Might have to be a 'select all CDs' as
       opposed to choose which CD this agent runs on." A health check is exactly that — it
       looks at every domain in the process, so it links to all of them. */
    const healthCheck = await upsertPackage(
      "Procure-to-Pay AI Health Check",
      "Reviews every Procure-to-Pay capability domain and reports where AI can be applied. Seed row proving the many-to-many shape."
    );
    for (const d of p2p) {
      await prisma.packageCapabilityDomain.upsert({
        where: { package_id_capability_domain_id: { package_id: healthCheck, capability_domain_id: d.id } },
        create: { package_id: healthCheck, capability_domain_id: d.id },
        update: {},
      });
    }

    /* ── SHAPE 2: one package, TWO factors — one proportional, one FLAT ─────────
       The agent from the Step 5 roadmap and the GetTheTalent shot. It saves a share of
       CONTRACTED spend and separately avoids a fixed risk, which is precisely why factors
       are rows rather than columns. */
    const contracts = p2p.find((d) => d.name === "Contract Management") ?? p2p[0];
    const alertAgent = await upsertPackage(
      "Contract Price Alert Agent",
      "Watches for off-contract spend and renewal drift. Seed row proving the multi-factor shape."
    );
    await prisma.packageCapabilityDomain.upsert({
      where: { package_id_capability_domain_id: { package_id: alertAgent, capability_domain_id: contracts.id } },
      create: { package_id: alertAgent, capability_domain_id: contracts.id },
      update: {},
    });
    /* delete-then-write, scoped to this package only — a factor has no natural key */
    await prisma.packageValueFactor.deleteMany({ where: { package_id: alertAgent } });
    await prisma.packageValueFactor.createMany({
      data: [
        {
          package_id: alertAgent,
          basis: "CONTRACT_SPEND",
          /* 120 bps = 1.2% of the spend that sits on negotiated contracts. bps because the
             basis is proportional — see `factorUnit()`. */
          rate: 120,
          /* only credited where the domain is below the "integrated ERP" rung: an
             organisation already managing by exception is not losing this. */
          applies_below_rung: 37,
          note: "1.2% of contracted spend recovered on off-contract and renewal drift.",
        },
        {
          package_id: alertAgent,
          basis: "FLAT",
          /* ⚠ CENTS, not bps — FLAT is the one basis whose rate is an amount. $50,000. */
          rate: 5_000_000,
          applies_below_rung: null,
          note: "Avoids one disputed-renewal claim. Does not scale with buyer size.",
        },
      ],
    });

    /* ── report ── */
    const links = await prisma.packageCapabilityDomain.count();
    const factors = await prisma.packageValueFactor.count();
    const hcLinks = await prisma.packageCapabilityDomain.count({ where: { package_id: healthCheck } });
    const agentFactors = await prisma.packageValueFactor.findMany({
      where: { package_id: alertAgent },
      select: { basis: true, rate: true, applies_below_rung: true },
      orderBy: { basis: "asc" },
    });
    console.log(`\n  SHAPE 1 — "Procure-to-Pay AI Health Check" links to ${hcLinks} capability domains`);
    p2p.forEach((d) => console.log(`      ${d.name}`));
    console.log(`\n  SHAPE 2 — "Contract Price Alert Agent" carries ${agentFactors.length} value factors`);
    agentFactors.forEach((f) =>
      console.log(
        `      ${f.basis.padEnd(20)} rate ${String(f.rate).padStart(9)} ${f.basis === "FLAT" ? "cents" : "bps  "}   applies_below_rung ${f.applies_below_rung ?? "any"}`
      )
    );
    console.log(`\n  totals: ${links} PackageCapabilityDomain rows, ${factors} PackageValueFactor rows`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
