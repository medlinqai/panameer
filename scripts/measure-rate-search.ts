import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { marketplaceVisibleWhere } from "@/lib/access";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const MIN_DISTINCT_PROVIDERS = 5;

const HAS_RANGE = {
  OR: [{ rate_min_cents: { not: null } }, { rate_max_cents: { not: null } }],
};

/** Distinct providers per skill, for a given provider predicate. */
async function coverage(where: object): Promise<Map<string, Set<string>>> {
  const rows = await prisma.providerSkill.findMany({
    where: { providerProfile: where as never },
    select: { skill_id: true, provider_profile_id: true },
  });
  const m = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!m.has(r.skill_id)) m.set(r.skill_id, new Set());
    m.get(r.skill_id)!.add(r.provider_profile_id);
  }
  return m;
}

function band(m: Map<string, Set<string>>, totalSkills: number) {
  const c = [...m.values()].map((s) => s.size);
  return {
    zero: totalSkills - m.size,
    one4: c.filter((x) => x >= 1 && x <= 4).length,
    five9: c.filter((x) => x >= 5 && x <= 9).length,
    ten: c.filter((x) => x >= 10).length,
    best: Math.max(0, ...c),
    clearing: c.filter((x) => x >= MIN_DISTINCT_PROVIDERS).length,
  };
}

async function main() {
  const visible = marketplaceVisibleWhere();
  const totalSkills = await prisma.skill.count();

  const [profiles, visibleCount, anyRate, withRange, onlyLegacy, eligible] = await Promise.all([
    prisma.providerProfile.count(),
    prisma.providerProfile.count({ where: visible }),
    prisma.providerProfile.count({
      where: {
        OR: [
          { rate_min_cents: { not: null } }, { rate_max_cents: { not: null } },
          { hourly_rate_cents: { not: null } }, { onsite_rate_cents: { not: null } },
          { remote_rate_cents: { not: null } },
        ],
      },
    }),
    prisma.providerProfile.count({ where: HAS_RANGE }),
    prisma.providerProfile.count({
      where: {
        rate_min_cents: null, rate_max_cents: null, hourly_rate_cents: null,
        OR: [{ onsite_rate_cents: { not: null } }, { remote_rate_cents: { not: null } }],
      },
    }),
    prisma.providerProfile.count({ where: { ...visible, ...HAS_RANGE } }),
  ]);

  console.log("=== PROVIDER POPULATION ===");
  console.log(`  ProviderProfile rows ................. ${profiles}`);
  console.log(`  marketplace-visible .................. ${visibleCount}`);
  console.log(`  with ANY rate field ................. ${anyRate}`);
  console.log(`  with the RANGE (min/max) ............ ${withRange}`);
  console.log(`  only onsite_/remote_ (EXCLUDED) ..... ${onlyLegacy}`);
  console.log(`  ELIGIBLE POOL (visible + range) ..... ${eligible}`);

  /* ⚠⚠ SCOPED TO `marketplaceVisibleWhere()`. `lib/provider-rates.ts` is
     deliberately NOT scoped — *"the caller has already decided who it is
     showing."* THAT REASONING DOES NOT TRANSFER: a report has no caller who chose
     these people, so an unscoped aggregate would include providers the buyer has
     no right to see. */
  const scoped = band(await coverage({ ...visible, ...HAS_RANGE }), totalSkills);
  console.log(`\n=== SKILLS BY DISTINCT ELIGIBLE PROVIDERS (floor n=${MIN_DISTINCT_PROVIDERS}) ===`);
  console.log(`  total Skill rows .................... ${totalSkills}`);
  console.log(`  0 providers ......................... ${scoped.zero}`);
  console.log(`  1–4 (BELOW the floor) ............... ${scoped.one4}`);
  console.log(`  5–9 ................................. ${scoped.five9}`);
  console.log(`  10+ ................................. ${scoped.ten}`);
  console.log(`  CLEARING THE FLOOR .................. ${scoped.clearing} of ${totalSkills}`);
  console.log(`  best-covered skill has .............. ${scoped.best} providers`);

  /* ⚠ THE COUNTERFACTUAL MATTERS, because the obvious response to a small pool is
     "relax the visibility rule". It does not help — and knowing that stops
     somebody loosening a privacy gate for nothing. */
  const permissive = band(await coverage(HAS_RANGE), totalSkills);
  console.log(`\n=== COUNTERFACTUAL — visibility IGNORED (${withRange} rated providers) ===`);
  console.log(`  skills clearing the floor ........... ${permissive.clearing} of ${totalSkills}`);
  console.log(`  best-covered skill has .............. ${permissive.best} providers`);

  const viable = scoped.clearing > 0;
  console.log(
    `\n${viable
      ? `✅ VIABLE — ${scoped.clearing} skill(s) clear n=${MIN_DISTINCT_PROVIDERS}. E389 can be re-opened.`
      : `⛔ NOT VIABLE — no skill clears n=${MIN_DISTINCT_PROVIDERS}. Publishing a rate report today would say "Not enough data yet" on every row.`}`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
