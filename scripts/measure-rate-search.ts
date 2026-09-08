/**
 * `measure:rate-search` — IS THERE ENOUGH DATA TO PUBLISH A RATE REPORT YET?
 * (`P1-J1-E389` WS-1). `npm run measure:rate-search`.
 *
 * ── ⚠⚠ THIS IS A MEASUREMENT, NOT A GATE ───────────────────────────────────
 *
 * It is deliberately NOT a `check:*` script and it is NOT wired into any merge
 * gate. It answers one question and prints the answer; it never fails a build.
 * **Today the answer is NO**, and a gate that goes red because a marketplace is
 * young would be noise, not signal.
 *
 * ── WHY IT EXISTS AT ALL ────────────────────────────────────────────────────
 *
 * `E389` asked for a Rate Search report and made WS-1 — this measurement — the
 * gate on the whole brief: *"IF ALMOST EVERY SKILL FALLS BELOW THE FLOOR, STOP AND
 * REPORT. Do not ship a report that says 'not enough data' on every row — that is
 * a worse first impression than not shipping it."*
 *
 * **MEASURED 2026-09-08 against the live database: ZERO of 710 skills clear the
 * n=5 floor, and the best-covered skill has FOUR distinct rated providers.** So
 * nothing was built. ⚠ THE NUMBER WILL CHANGE AS PROVIDERS ONBOARD, and the
 * decision should be re-made from data rather than from this comment — which is
 * the whole reason this file is committed instead of thrown away.
 *
 * ── ⚠⚠ THE SUPPRESSION RULE IS THE POINT, AND IT IS NOT NEGOTIABLE ──────────
 *
 * **n = 5 DISTINCT providers.** *"An average rate computed from three providers is
 * not a statistic — it is the disclosure of three people's rates, dressed as
 * analysis. A buyer who knows the market can name them."* Whoever revisits this
 * must keep that floor; the interesting question is whether the DATA has grown,
 * never whether the floor could be lowered.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { marketplaceVisibleWhere } from "@/lib/access";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** ⚠ THE FLOOR. Below this a row shows "Not enough data yet" — never a number. */
const MIN_DISTINCT_PROVIDERS = 5;

/**
 * ⚠⚠ THE RANGE, NOT `hourly_rate_cents`. The schema says the single rate is
 * *"SUPERSEDED for display by the RANGE"* and survives only because the publish
 * gate and the completeness score read it.
 * ⚠ AND NOT `onsite_`/`remote_rate_cents` either — those are settings-era fields
 * that predate the range, and mixing them in would average two different things.
 */
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
    /* ⚠ DISTINCT PROVIDERS, NOT ROWS. One provider reaching a skill twice must
       not count twice toward the floor — that is how a floor gets cleared by one
       person with two profiles. */
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
    /* ⚠ REPORTED AND EXCLUDED, per the brief: providers carrying ONLY the
       settings-era fields have no range to take a midpoint from. */
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
