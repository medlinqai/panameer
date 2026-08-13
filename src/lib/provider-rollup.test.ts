import {
  monthsBetween,
  recency,
  RECENCY_FLOOR,
  RECENCY_HALF_LIFE_YEARS,
  SELF_ADDED_WEIGHT,
} from "./provider-rollup";

/**
 * The weighting arithmetic (brief_per_job_skill_model WS-2).
 *
 *   npm run check:rollup
 *
 * Pure functions only — no database. The ranking behaviour the brief specifies
 * is a property of these two functions, and it is the kind of thing that
 * degrades quietly: a decay tweak that looks harmless can invert the order of
 * two providers in a search result and nothing anywhere will complain.
 */

let pass = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const NOW = new Date("2026-08-11T00:00:00Z");
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);
const yearsAgo = (n: number) => new Date(NOW.getTime() - n * 365.25 * 24 * 3600 * 1000);

console.log("\nprovider-rollup.ts\n");

// --- months -----------------------------------------------------------------
ok("a 12-month job is 12 months", monthsBetween(at("2020-01-01"), at("2021-01-01"), NOW) === 12);
ok(
  "an open job runs to today",
  monthsBetween(at("2025-08-11"), null, NOW) === 12,
  String(monthsBetween(at("2025-08-11"), null, NOW))
);
ok("no start date scores nothing", monthsBetween(null, at("2021-01-01"), NOW) === 0);
/*
  A same-day or reversed range is a typo or a parser slip, not a claim of zero
  experience. Scoring it 0 would silently drop the skill off the profile.
*/
ok("a same-day range still counts as a month", monthsBetween(at("2020-01-01"), at("2020-01-01"), NOW) === 1);
ok("a reversed range still counts as a month", monthsBetween(at("2021-01-01"), at("2020-01-01"), NOW) === 1);

// --- recency ----------------------------------------------------------------
ok("current work is undecayed", recency(null, NOW) === 1);
ok(
  "one half-life halves it",
  Math.abs(recency(yearsAgo(RECENCY_HALF_LIFE_YEARS), NOW) - 0.5) < 0.01,
  String(recency(yearsAgo(RECENCY_HALF_LIFE_YEARS), NOW))
);
ok(
  "two half-lives quarter it",
  Math.abs(recency(yearsAgo(RECENCY_HALF_LIFE_YEARS * 2), NOW) - 0.25) < 0.01
);
ok(
  "ancient work hits the floor, never zero",
  recency(yearsAgo(40), NOW) === RECENCY_FLOOR
);
ok("decay is monotonic", recency(yearsAgo(1), NOW) > recency(yearsAgo(5), NOW));

// --- the brief's acceptance case -------------------------------------------
/*
  "A 6.5-yr recent Oracle GL outranks a 6-mo old contract GL."
*/
const deepRecent = 78 * recency(at("2026-02-01"), NOW); // 6.5 yrs, ended this year
const shallowOld = 6 * recency(at("2016-01-01"), NOW); //  6 mo, a decade ago
ok(
  "6.5 recent years outranks a 6-month contract from a decade ago",
  deepRecent > shallowOld,
  `${deepRecent.toFixed(1)} vs ${shallowOld.toFixed(1)}`
);

/*
  And the harder direction, which is the whole reason for decaying at all:
  a LONGER but stale engagement should lose to a shorter current one. Two years
  running right now beats four years that ended twelve years ago.
*/
const staleLong = 48 * recency(yearsAgo(12), NOW);
const freshShort = 24 * recency(null, NOW);
ok(
  "2 current years outrank 4 years that ended 12 years ago",
  freshShort > staleLong,
  `${freshShort.toFixed(1)} vs ${staleLong.toFixed(1)}`
);

/*
  But not TOO aggressive: a long career should not be erased by a recent gap.
  Ten years ending two years ago must still beat six months of current work.
*/
const veteran = 120 * recency(yearsAgo(2), NOW);
const novice = 6 * recency(null, NOW);
ok(
  "a 10-year veteran two years out still outranks 6 months of current work",
  veteran > novice,
  `${veteran.toFixed(1)} vs ${novice.toFixed(1)}`
);

// --- the escape hatch --------------------------------------------------------
/*
  Self-added has to be visible but never mistakable for depth: below the
  shortest plausible real engagement, above nothing.
*/
const shortestRealJob = 1 * RECENCY_FLOOR;
ok("a self-added skill is non-zero", SELF_ADDED_WEIGHT > 0);
ok(
  "a self-added skill outweighs no claim at all but stays tiny",
  SELF_ADDED_WEIGHT < 12 * RECENCY_FLOOR && SELF_ADDED_WEIGHT >= shortestRealJob,
  String(SELF_ADDED_WEIGHT)
);
ok(
  "a self-added skill loses to one recent year of real work",
  SELF_ADDED_WEIGHT < 12 * recency(null, NOW)
);

console.log(`\n${pass} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
