/**
 * `check:duration` — a lesson's numeric length, and the four ways it goes wrong
 * (`P1-J3-E361` WS-3).
 *
 *   1  ⚠⚠ NO COMPONENT SUMS `run_time`. Re-asserted HERE as well as in
 *      `check:learn` GUARD 1, because THIS BRIEF IS EXACTLY WHEN SOMEBODY WOULD
 *      BE TEMPTED — a numeric column arrives and the string column is right next
 *      to it. `run_time` is display copy and really does contain `Intro`, `NA`,
 *      `Done` and `Incomplete`.
 *   2  `duration_seconds` IS NEVER NEGATIVE AND NEVER OVER THE CEILING.
 *   3  A NUMBER ALWAYS HAS A SOURCE AND A SOURCE ALWAYS HAS A NUMBER — a
 *      duration nobody can attribute is a duration nobody can defend.
 *   4  ⚠⚠ A SUM OVER A MIXED SET IS NEVER PRESENTED AS COMPLETE. `totalDuration`
 *      must hand back the count it COULD NOT include, so no caller can render a
 *      total that silently omits untimed lessons. This is the assertion that
 *      stops the feature becoming a lie: measured live, Inventory Management has
 *      2 of 47 playable lessons timed.
 *   5  THE CONVERSION IS PURE AND PINNED TO THE MEASURED PAIRS.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN, reusing `check-community.ts`'s
 * `strip()` — this file names every forbidden pattern in its own prose.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import {
  DURATION_CEILING_SECONDS,
  describeTotal,
  formatDuration,
  parseRunTime,
  totalDuration,
} from "@/lib/lesson-duration";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/* ⚠ VERBATIM FROM `scripts/check-community.ts`. */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------------
// GUARD 1 — ⚠⚠ nothing sums run_time
// ---------------------------------------------------------------------------

const SELF = join("scripts", "check-duration.ts");
const LIB = join("src", "lib", "lesson-duration.ts");
const files = [...walk("src"), ...walk("scripts")].filter((f) => f !== SELF);

/*
  ⚠ THE PATTERNS THAT MEAN "SOMEBODY IS DOING ARITHMETIC ON A DISPLAY STRING".
  `run_time` inside a reduce, a `+=`, a `parseInt`/`Number`, or a sum helper.
*/
const SUM_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "reduce over run_time", re: /reduce\s*\([^)]*run_time/ },
  { name: "run_time inside a reduce body", re: /run_time[^\n]{0,60}\breduce\b/ },
  { name: "+= on run_time", re: /run_time\s*\)?\s*(\+=|\+\s*\w)/ },
  { name: "Number(run_time)", re: /Number\s*\(\s*[\w.]*run_time/ },
  { name: "parseInt/parseFloat on run_time", re: /parse(Int|Float)\s*\(\s*[\w.]*run_time/ },
  { name: "sum(run_time)", re: /sum\w*\s*\(\s*[\w.]*run_time/i },
];
for (const f of files) {
  const body = strip(readFileSync(f, "utf8"));
  if (!/run_time/.test(body)) continue;
  for (const p of SUM_PATTERNS) {
    check(
      `1 — ${f} does not do "${p.name}"`,
      !p.re.test(body),
      "run_time is display copy — sum duration_seconds instead"
    );
  }
}
/* ⚠ AND `check:learn` GUARD 1 MUST STILL BE THERE. This brief must not have
   relaxed it, and asserting its presence is how that stays true. */
const learnHarness = join("scripts", "check-learn.ts");
check(`1 — ${learnHarness} still exists`, existsSync(learnHarness));
const learnSrc = existsSync(learnHarness) ? readFileSync(learnHarness, "utf8") : "";
check(
  "1 — ⚠ check:learn's ban on summing run_time is still in place",
  /NO SUMMED DURATIONS/.test(learnSrc) && /run_time/.test(learnSrc),
  "GUARD 1 is permanent — this brief added a separate column instead of relaxing it"
);
check(
  "1 — the duration lib does not read run_time as a number anywhere but the parser",
  (strip(readFileSync(LIB, "utf8")).match(/run_time/g) ?? []).length === 0,
  "the parser takes a plain string; it must not reach into the model"
);

// ---------------------------------------------------------------------------
// GUARD 5 — the conversion, pinned to the MEASURED pairs
// ---------------------------------------------------------------------------

const secOf = (raw: string | null | undefined) => {
  const p = parseRunTime(raw);
  return p.ok ? p.seconds : null;
};

/*
  ⚠⚠ THE TWO PAIRS THAT PROVE THE 60× RULE, measured against Vimeo's oEmbed on
  2026-09-02 and exact to the second. If either of these ever changes, the rule
  changed and somebody has to know.
*/
check("5 — `2:13:00` -> 133 (2.1 What is IaaS; Vimeo says 133)", secOf("2:13:00") === 133);
check("5 — `2:21:00` -> 141 (2.2 What is PaaS; Vimeo says 141)", secOf("2:21:00") === 141);
check("5 — `:56` -> 56", secOf(":56") === 56);
check("5 — `:33` -> 33", secOf(":33") === 33);
/* `N days, H:MM:SS` — measured shapes. */
check("5 — `1 day, 2:43:00` -> 1603", secOf("1 day, 2:43:00") === 1603);
check("5 — `2 days, 9:16:00` -> 3436", secOf("2 days, 9:16:00") === 3436);
check("5 — `4 days, 4:36:00` -> 6036", secOf("4 days, 4:36:00") === 6036);

/* ⚠ THE STATUS WORDS THAT LANDED IN A TIME COLUMN. Measured distinct set. */
for (const word of ["Intro", "intro", "NA", "Done", "Incomplete"]) {
  check(`5 — \`${word}\` -> null (a status word is not a duration)`, secOf(word) === null);
  check(`5 — and it is reported as a status_word, not "unrecognised"`, (() => {
    const p = parseRunTime(word);
    return !p.ok && p.reason === "status_word";
  })());
}
check("5 — empty -> null", secOf("") === null && secOf(null) === null && secOf(undefined) === null);
/* ⚠ THE CEILING. Measured: `22 days, 8:12:00` is 32172 s and must be rejected. */
check("5 — the ceiling is two hours", DURATION_CEILING_SECONDS === 7200);
check("5 — `22 days, 8:12:00` -> null (over the ceiling)", secOf("22 days, 8:12:00") === null);
check("5 — and it says why", (() => { const p = parseRunTime("22 days, 8:12:00"); return !p.ok && p.reason === "over_ceiling"; })());
check("5 — exactly at the ceiling is allowed", secOf("120:00:00") === 7200);
check("5 — one second over is not", secOf("120:01:00") === null);
/* ⚠ NON-ZERO SECONDS ARE REFUSED, not silently truncated. Measured: 3 rows. */
check("5 — `2:12:31` -> null (SS is not 00, so the cell is not what we think)", secOf("2:12:31") === null);
check("5 — and it says why", (() => { const p = parseRunTime("2:12:31"); return !p.ok && p.reason === "seconds_not_zero"; })());
check("5 — a zero total is not a duration", secOf("0:00:00") === null);
check("5 — garbage -> null", secOf("--") === null && secOf("12") === null);

// ---------------------------------------------------------------------------
// GUARD 4 — ⚠⚠ a partial total can never be presented as complete
// ---------------------------------------------------------------------------

const mixed = [{ duration_seconds: 133 }, { duration_seconds: 141 }, { duration_seconds: null }];
const t = totalDuration(mixed);
check("4 — the total sums only what it has", t.seconds === 274);
check("4 — ⚠ it reports HOW MANY it counted", t.counted === 2);
check("4 — ⚠⚠ AND HOW MANY IT COULD NOT INCLUDE", t.missing === 1);
check("4 — ⚠ and it says it is not complete", t.complete === false);
check("4 — a wholly timed set IS complete", totalDuration([{ duration_seconds: 60 }]).complete === true);
check("4 — an empty set is complete and zero", (() => { const e = totalDuration([]); return e.complete && e.seconds === 0 && e.counted === 0; })());
check("4 — a zero duration counts as missing, not as counted", totalDuration([{ duration_seconds: 0 }]).missing === 1);
/*
  ⚠⚠ THE RETURN TYPE IS THE GUARANTEE — there must be NO exported helper that
  hands back a bare summed number, because that is the one shape a caller could
  render without ever seeing `missing`.
*/
const libSrc = strip(readFileSync(LIB, "utf8"));
check(
  "4 — ⚠ no exported function returns a bare total number of seconds",
  !/export function \w*[Tt]otal\w*\([^)]*\)\s*:\s*number/.test(libSrc),
  "a total must arrive with its `missing` count"
);
check(
  "4 — the sentence NAMES the gap when there is one",
  describeTotal({ seconds: 328, counted: 2, missing: 45, complete: false }) === "5m 28s across 2 of 47 lessons",
  "measured on Inventory Management, the tester's path"
);
check(
  "4 — and says just the time when nothing is missing",
  describeTotal({ seconds: 3070, counted: 11, missing: 0, complete: true }) === "51m 10s",
  "measured on the Overview path"
);
check("4 — the formatter keeps seconds under an hour", formatDuration(133) === "2m 13s");
check("4 — and drops them over an hour", formatDuration(6036) === "1h 40m");
check("4 — a zero formats to nothing, not to `0m`", formatDuration(0) === "");

// ---------------------------------------------------------------------------
// GUARDS 2 + 3 — the DATA, live
// ---------------------------------------------------------------------------

async function data() {
  const bad = await prisma.lesson.count({
    where: { OR: [{ duration_seconds: { lt: 1 } }, { duration_seconds: { gt: DURATION_CEILING_SECONDS } }] },
  });
  check("2 — ⚠ no lesson has a duration below 1s or above the ceiling", bad === 0, `${bad} row(s) out of range`);

  const numberNoSource = await prisma.lesson.count({
    where: { duration_seconds: { not: null }, duration_source: null },
  });
  const sourceNoNumber = await prisma.lesson.count({
    where: { duration_seconds: null, duration_source: { not: null } },
  });
  check("3 — ⚠ every duration has a source", numberNoSource === 0, `${numberNoSource} number(s) with no provenance`);
  check("3 — and every source has a duration", sourceNoNumber === 0, `${sourceNoNumber} source(s) with no number`);

  const badSource = await prisma.lesson.count({
    where: { duration_source: { notIn: ["xls", "vimeo"] }, NOT: { duration_source: null } },
  });
  check("3 — the only sources are `xls` and `vimeo`", badSource === 0, `${badSource} unknown source(s)`);

  /*
    ⚠ AND THE STORED VALUES STILL AGREE WITH THE PARSER. This is what catches a
    hand-edited row or a second writer: every `xls`-sourced duration must be
    exactly what `parseRunTime` produces from its own `run_time`.
  */
  const xlsRows = await prisma.lesson.findMany({
    where: { duration_source: "xls" },
    select: { title: true, run_time: true, duration_seconds: true },
  });
  const drifted = xlsRows.filter((l) => {
    const p = parseRunTime(l.run_time);
    return !p.ok || p.seconds !== l.duration_seconds;
  });
  check(
    "3 — ⚠ every xls duration still matches its own run_time string",
    drifted.length === 0,
    drifted.slice(0, 3).map((d) => `"${d.run_time}" != ${d.duration_seconds} (${d.title.slice(0, 40)})`).join("; ")
  );
  check("3 — the backfill actually populated something", xlsRows.length > 100, `only ${xlsRows.length} xls rows`);
}

data()
  .then(() => prisma.$disconnect())
  .then(() => {
    if (failures.length > 0) {
      console.error(`check:duration — ${failures.length} FAILED, ${pass} passed\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:duration — ${pass}/${pass} passed`);
  });
