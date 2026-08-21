/**
 * `check:solution-types` — a service product's kind, its billing shape, and the
 * fields each one is allowed to hold (brief_solution_types WS5).
 *
 * FIVE PROPERTIES, and each is a thing that fails silently otherwise:
 *
 *   1  `PackageKind` is EXACTLY `DEPLOYABLE · HOURS · DELIVERABLE` — and NOT
 *      `EXPERT` (an expert is a Person with a rate, not a Package) and NOT
 *      `DEPLOYMENT` (one letter from DEPLOYABLE, opposite meaning).
 *   2  Every row that existed before the column did reads `DELIVERABLE`.
 *   3  The WS3 table holds for EVERY LIVE ROW — a DEPLOYABLE with a duration, a
 *      milestone, a deliverable or a non-RECURRING price fails.
 *   4  `billing_period` is present EXACTLY when the pricing is RECURRING.
 *   5  ⚠ NOTHING MAPS `kind` TO A PRICE, A RAIL OR A LABEL YET. This brief stores;
 *      it does not decide. The six buyer-facing labels are a display concern and
 *      the rail depends on an integration that does not exist.
 *
 * ⚠ THE ENUM CHECK READS `schema.prisma`, NOT THE GENERATED CLIENT. A generated
 * client is a build artifact of the schema; asserting against it would prove only
 * that `prisma generate` ran.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN. This file's own prose names every
 * banned token, and a scanner that read comments would fail on its own documentation.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import {
  PACKAGE_KINDS,
  PRICING_FOR_KIND,
  solutionViolations,
  type PackageKind,
  type SolutionRow,
} from "@/lib/catalog/solution-types";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const SCHEMA_RAW = readFileSync(join("prisma", "schema.prisma"), "utf8");

// ---------------------------------------------------------------------------
// 1 — the enum is exactly three members, and two names are banned
// ---------------------------------------------------------------------------

const enumBody = (name: string) => {
  const m = SCHEMA_RAW.match(new RegExp(`enum ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!m) return null;
  return m[1]
    .split("\n")
    .map((l) => l.replace(/\/\/\/.*$/, "").trim())
    .filter((l) => /^[A-Z_]+$/.test(l));
};

const kinds = enumBody("PackageKind");
check("1 — enum PackageKind exists in schema.prisma", kinds !== null);
check(
  "1 — PackageKind is exactly DEPLOYABLE, HOURS, DELIVERABLE",
  JSON.stringify([...(kinds ?? [])].sort()) ===
    JSON.stringify([...PACKAGE_KINDS].sort()),
  (kinds ?? []).join(", ")
);
/*
  ⚠ BY NAME, BOTH OF THEM, because each would be a different kind of wrong. `EXPERT`
  would permit a Package with no human attached; `DEPLOYMENT` would silently swap a
  subscription for a fixed-price project.
*/
for (const banned of ["EXPERT", "DEPLOYMENT"]) {
  check(
    `1 — PackageKind does NOT contain ${banned}`,
    !(kinds ?? []).includes(banned),
    banned === "EXPERT"
      ? "an expert is a Person with a rate, not a Package"
      : "one letter from DEPLOYABLE and the opposite meaning"
  );
}
check(
  "1 — the lib mirror matches the schema, so the rule and the column cannot drift",
  JSON.stringify([...PACKAGE_KINDS].sort()) === JSON.stringify([...(kinds ?? [])].sort())
);

const pricing = enumBody("PackagePricingType");
check(
  "1 — PackagePricingType gained RECURRING and kept the other three",
  JSON.stringify([...(pricing ?? [])].sort()) ===
    JSON.stringify(["FIXED", "HOURLY", "RECURRING", "TM"]),
  (pricing ?? []).join(", ")
);
const periods = enumBody("BillingPeriod");
check(
  "1 — BillingPeriod is MONTHLY, ANNUAL",
  JSON.stringify([...(periods ?? [])].sort()) === JSON.stringify(["ANNUAL", "MONTHLY"]),
  (periods ?? []).join(", ")
);
check(
  "1 — kind defaults to DELIVERABLE, so a pre-existing row keeps behaving as it did",
  /kind\s+PackageKind\s+@default\(DELIVERABLE\)/.test(SCHEMA_RAW)
);
check(
  "1 — billing_period is NULLABLE — a FIXED package has no period to store",
  /billing_period\s+BillingPeriod\?/.test(SCHEMA_RAW)
);
/*
  ⚠ `P1-J2-E007` IS DISSOLVED, NOT PENDING. Scott, 2026-08-21: an agent is an expert's
  product. So none of that error's three options may appear — no first-party flag, no
  nullable owner, no house-product model — and the owner column stays NOT NULL.
*/
check(
  "1 — provider_profile_id on Package is still NOT NULL — an agent has an owner",
  /model Package \{[\s\S]{0,400}provider_profile_id String\s+@db\.Uuid/.test(SCHEMA_RAW),
  "E007 was dissolved by making an agent an expert's product, not by loosening this"
);
check(
  "1 — no HouseProduct model and no first-party flag were introduced",
  !/model HouseProduct|is_first_party|first_party/.test(SCHEMA_RAW)
);

// ---------------------------------------------------------------------------
// 5 — nothing maps kind to a price, a rail or a label
// ---------------------------------------------------------------------------

/*
  ⚠ THIS IS THE ASSERTION THAT KEEPS THE BRIEF HONEST. It stores a kind; it does not
  decide what a kind costs, which rail it takes, or what a buyer sees it called. The
  six labels are derived when a surface needs them, and the rail depends on a payments
  integration that does not exist.

  Scanned for the SHAPE of such a map — a lookup keyed by the kind names — rather than
  for the words, so a `Record<PackageKind, …>` of prices fails wherever it is written.
*/
const SELF = join("scripts", "check-solution-types.ts");
const RULE = join("src", "lib", "catalog", "solution-types.ts");
const bodies = new Map(
  [...walk("src"), ...walk("scripts")]
    .filter((f) => f !== SELF)
    .map((f) => [f, stripComments(readFileSync(f, "utf8"))])
);

const KIND_KEYED = /(DEPLOYABLE|DELIVERABLE)\s*:\s*(["'`$]|\d)/;
const mapOffenders = [...bodies.entries()]
  .filter(([f]) => f !== RULE)
  .filter(([, b]) => KIND_KEYED.test(b))
  .map(([f]) => f);
check(
  "5 — no file maps a PackageKind to a price, a rail or a label",
  mapOffenders.length === 0,
  mapOffenders.join(", ")
);
/*
  The rule file is exempt from the scan above because `PRICING_FOR_KIND` is keyed by
  kind — but it may only hold PRICING SHAPES, never money, a rail or a label. Asserted
  positively rather than by exempting the file and hoping.
*/
const ruleBody = bodies.get(RULE) ?? "";
check("5 — the rule file exists", ruleBody.length > 0);
check(
  "5 — the rule file holds no money, no rail and no label map",
  !/price_cents|cents|\bACH\b|\bwire\b|\bcard\b|label/i.test(ruleBody),
  "PRICING_FOR_KIND may hold pricing SHAPES only"
);
check(
  "5 — and it exports no price or rail helper",
  !/export (const|function) (priceFor|railFor|labelFor|kindLabel)/.test(ruleBody)
);

/*
  ⚠ AND THE RENDER PATH MUST STAY AN EXPLICIT PROJECTION — this is what makes adding
  a column to `Package` safe at all.

  `lib/packages.ts` is the ONLY reader of `Package` rows in the repo
  (`listOwnPackages`, behind `/settings/packages` and `/api/provider/packages`). It
  uses `include`, which returns EVERY scalar — so if `shape()` spread the row, `kind`
  and `billing_period` would have appeared in every payload the moment this brief
  pushed, and "every existing row renders exactly as before" would have been false
  without one line of UI changing.

  Measured rather than reasoned: the shaped payload for the one PUBLISHED package
  contains neither new key, and still reads `priceCents 4000000` and
  `durationWeeks 5`. Asserted here so a future `...p` cannot quietly undo it.
*/
const PKG_LIB = join("src", "lib", "packages.ts");
const pkgLib = bodies.get(PKG_LIB) ?? "";
check("2 — the package read path exists where this guard expects it", pkgLib.length > 0);
check(
  "2 — shape() is an EXPLICIT projection, not a spread of the row",
  /const shape = \(p: \{[\s\S]{0,2000}\}\) => \(\{/.test(pkgLib) && !/=> \(\{\s*\.\.\.p\b/.test(pkgLib),
  "a spread would leak every new column into every package payload"
);
check(
  "2 — and it projects neither of the new columns yet — nothing displays them",
  !/\bkind\s*:\s*p\.kind\b/.test(pkgLib) && !/billingPeriod\s*:\s*p\.billing_period/.test(pkgLib),
  "this brief stores; a surface that shows a kind is a later decision"
);

// ---------------------------------------------------------------------------
// 3 + 4 — the rule itself, on literals (fast, and independent of the database)
// ---------------------------------------------------------------------------

const row = (o: Partial<SolutionRow> & { kind: PackageKind }): SolutionRow => ({
  pricing_type: o.kind === "DEPLOYABLE" ? "RECURRING" : o.kind === "HOURS" ? "HOURLY" : "FIXED",
  billing_period: o.kind === "DEPLOYABLE" ? "MONTHLY" : null,
  duration_weeks: null,
  milestones: 0,
  deliverables: 0,
  ...o,
});

check("3 — a clean DEPLOYABLE passes", solutionViolations(row({ kind: "DEPLOYABLE" })).length === 0);
check("3 — a clean HOURS passes", solutionViolations(row({ kind: "HOURS" })).length === 0);
check("3 — a clean DELIVERABLE passes", solutionViolations(row({ kind: "DELIVERABLE" })).length === 0);
check(
  "3 — a DEPLOYABLE with duration_weeks FAILS",
  solutionViolations(row({ kind: "DEPLOYABLE", duration_weeks: 4 })).some((v) => /duration_weeks/.test(v))
);
check(
  "3 — a DEPLOYABLE with a milestone FAILS",
  solutionViolations(row({ kind: "DEPLOYABLE", milestones: 1 })).some((v) => /milestones/.test(v))
);
check(
  "3 — a DEPLOYABLE with a deliverable FAILS",
  solutionViolations(row({ kind: "DEPLOYABLE", deliverables: 1 })).some((v) => /deliverables/.test(v))
);
check(
  "3 — a DEPLOYABLE priced FIXED FAILS",
  solutionViolations(row({ kind: "DEPLOYABLE", pricing_type: "FIXED", billing_period: null })).some(
    (v) => /may not be priced/.test(v)
  )
);
check(
  "3 — a DELIVERABLE priced RECURRING FAILS",
  solutionViolations(row({ kind: "DELIVERABLE", pricing_type: "RECURRING", billing_period: "MONTHLY" })).some(
    (v) => /may not be priced/.test(v)
  )
);
check(
  "3 — HOURS may be HOURLY or RECURRING, and nothing else",
  PRICING_FOR_KIND.HOURS.length === 2 &&
    solutionViolations(row({ kind: "HOURS", pricing_type: "RECURRING", billing_period: "MONTHLY" })).length === 0 &&
    solutionViolations(row({ kind: "HOURS", pricing_type: "TM" })).some((v) => /may not be priced/.test(v))
);
check(
  "4 — RECURRING without a billing_period FAILS",
  solutionViolations(row({ kind: "DEPLOYABLE", billing_period: null })).some((v) => /needs a billing_period/.test(v))
);
check(
  "4 — FIXED with a billing_period FAILS",
  solutionViolations(row({ kind: "DELIVERABLE", billing_period: "MONTHLY" })).some((v) =>
    /must not carry a billing_period/.test(v)
  )
);
/* ⚠ `expected` IS NOT ENFORCED — see the note in the rule file. A DELIVERABLE with no
   duration and no milestones is the two rows that existed before this column did. */
check(
  "4 — a DELIVERABLE with no duration and no milestones is ALLOWED, not a violation",
  solutionViolations(row({ kind: "DELIVERABLE" })).length === 0,
  "enforcing `expected` would fail rows this brief's own default created"
);

// ---------------------------------------------------------------------------
// 2 + 3 — against the live database
// ---------------------------------------------------------------------------

async function live() {
  const rows = await prisma.package.findMany({
    select: {
      id: true,
      title: true,
      kind: true,
      pricing_type: true,
      billing_period: true,
      duration_weeks: true,
      created_at: true,
      _count: { select: { milestones: true, deliverables: true } },
    },
    orderBy: { created_at: "asc" },
  });

  check("2 — there are packages to judge (guards against a vacuous pass)", rows.length > 0, `${rows.length}`);

  /*
    ⚠ EVERY PRE-EXISTING ROW READS `DELIVERABLE`. The column was added 2026-08-21 with
    that default precisely so nothing already in the catalog changed behaviour. Any
    row older than the column that reads something else was retyped by hand, which is
    seeding — out of scope for the brief that added it.
  */
  const COLUMN_ADDED = Date.parse("2026-08-21T00:00:00Z");
  const preExisting = rows.filter((r) => r.created_at.getTime() < COLUMN_ADDED);
  check(
    "2 — every row that predates the column reads DELIVERABLE",
    preExisting.every((r) => r.kind === "DELIVERABLE"),
    preExisting.filter((r) => r.kind !== "DELIVERABLE").map((r) => `${r.title}=${r.kind}`).join(", ")
  );

  const offenders = rows
    .map((r) => ({
      title: r.title,
      bad: solutionViolations({
        kind: r.kind as PackageKind,
        pricing_type: r.pricing_type as SolutionRow["pricing_type"],
        billing_period: r.billing_period as SolutionRow["billing_period"],
        duration_weeks: r.duration_weeks,
        milestones: r._count.milestones,
        deliverables: r._count.deliverables,
      }),
    }))
    .filter((x) => x.bad.length > 0);
  check(
    "3 — every live package row satisfies its own kind",
    offenders.length === 0,
    offenders.map((o) => `${o.title}: ${o.bad.join("; ")}`).join(" | ")
  );

  await prisma.$disconnect();

  if (failures.length > 0) {
    console.error(`check:solution-types — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:solution-types — ${pass}/${pass} passed`);
  console.log(
    `  (live: ${rows.length} package(s) — ` +
      Object.entries(
        rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.kind]: (a[r.kind] ?? 0) + 1 }), {})
      )
        .map(([k, n]) => `${k}=${n}`)
        .join(" ") +
      ")"
  );
}

void live();
