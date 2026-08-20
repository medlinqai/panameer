/**
 * `check:company-binding` — the defect class is "`Person.company_id` was treated
 * as proof of a company" (brief_company_binding_trap WS4).
 *
 * It cost Scott the entire buyer side: *"I went to look at the buyer side the
 * other day and I was forced to do something with my company details and I
 * couldn't, so it kept me from doing anything."* Two pieces of code disagreed
 * about one word — `requesterGaps` read `Person.company.name` (the signup
 * placeholder, which every account has) while `getCompanyBinding` read
 * `Person.companyMemberships` (which only two functions ever write) — and the
 * only UI that could reconcile them was behind the block itself.
 *
 *   1  NO COMPLETION PATH TESTS A COMPANY BY NAME OR BY `company_id`.
 *   2  `CompanyMembership` IS WRITTEN IN EXACTLY TWO PLACES — `defineCompany`
 *      and `joinCompany`. A third is a third attestation nobody made.
 *   3  `/company`'s NO-BINDING BRANCH RENDERS THE FORM, not a link.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SCAN. This file and the files it guards
 * both document the forbidden shapes at length; a scanner that read prose would
 * fail on its own documentation, and the fix for that is always to weaken the
 * scanner.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

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

const SELF = join("scripts", "check-company-binding.ts");
/*
  ⚠ `prisma/` IS IN SCOPE, AND THE FIRST VERSION OF THIS GUARD MISSED IT.

  I broke it deliberately with a membership-minting backfill dropped in
  `prisma/` and the guard passed — because it only walked `src/` and `scripts/`.
  A backfill is EXACTLY where this defect would arrive: the brief's instruction is
  "do not write a backfill that mints memberships", and a backfill does not live
  in `src/`.
*/
const files = [...walk("src"), ...walk("scripts"), ...walk("prisma")].filter((f) => f !== SELF);
const bodies = new Map(files.map((f) => [f, strip(readFileSync(f, "utf8"))]));

const ONBOARDING = join("src", "lib", "requester-onboarding.ts");
const COMPANY_LIB = join("src", "lib", "company.ts");
const COMPANY_PAGE = join("src", "app", "(app)", "company", "page.tsx");
const INLINE = join("src", "components", "company", "CompanyStepInline.tsx");
const STEPS = join("src", "app", "join", "requester", "steps", "page.tsx");

for (const f of [ONBOARDING, COMPANY_LIB, COMPANY_PAGE, INLINE, STEPS]) {
  check(`the file this guard is about exists: ${f}`, bodies.has(f));
}
const onboarding = bodies.get(ONBOARDING) ?? "";
const companyPage = bodies.get(COMPANY_PAGE) ?? "";
const steps = bodies.get(STEPS) ?? "";

// ---------------------------------------------------------------------------
// GUARD 1 — no completion path tests a company by name or by company_id
// ---------------------------------------------------------------------------

/**
 * Every gap/completion function in the repo, found rather than listed.
 *
 * `requesterGaps` was the one that broke; the guard covers its SIBLINGS too,
 * because the next one written is the next place this happens.
 */
const gapFns = [...bodies.entries()].flatMap(([file, body]) =>
  [...body.matchAll(/export (?:function|const) (\w*[Gg]aps\w*)\s*[(=]/g)].map((m) => ({
    file,
    name: m[1],
    /* The function body, bounded generously — enough to see its tests. */
    body: body.slice(m.index ?? 0, (m.index ?? 0) + 1400),
  }))
);
check("GUARD 1 — the guard can see the gap functions", gapFns.length >= 1, `${gapFns.length} found`);

/*
  ⚠ THE FORBIDDEN SHAPES. A company proven by the NAME of `Person.company`, or by
  the mere PRESENCE of `company_id`. Both are the placeholder answering a question
  it cannot answer.
*/
const NAME_TEST = /!\s*\w*\.?companyName[\s\S]{0,20}(trim\(\)|\)|\s*\|\||\s*\))|companyName\s*(===|!==)\s*["'`]/;
const ID_TEST = /!\s*\w*\.?company_?[Ii]d\b|company_?[Ii]d\s*(===|!==)\s*null/;
const nameOffences = gapFns.filter((g) => NAME_TEST.test(g.body)).map((g) => `${g.file}:${g.name}`);
const idOffences = gapFns.filter((g) => ID_TEST.test(g.body)).map((g) => `${g.file}:${g.name}`);
check(
  "GUARD 1 — no gap function proves a company by its NAME",
  nameOffences.length === 0,
  nameOffences.join(", ")
);
check(
  "GUARD 1 — no gap function proves a company by `company_id` being present",
  idOffences.length === 0,
  idOffences.join(", ")
);
/* Stated positively: it tests the BINDING. */
check(
  "GUARD 1 — requesterGaps tests the membership binding",
  /if \(!state\.company\.bound\) gaps\.push/.test(onboarding)
);
/*
  ⚠ PENDING MUST STILL SATISFY ONBOARDING. Requiring APPROVED here would swap
  this trap for a requester frozen until a stranger clicks Approve — two
  different bars, and `verifyTransactAbility` owns the stricter one.
*/
/*
  ⚠ `===` AND `!==`. The first version tested only `===` and missed the break I
  wrote to exercise it (`status !== "APPROVED"`), which is the same test stated
  the other way round. It failed on a different assertion, which is luck.
*/
check(
  "GUARD 1 — onboarding does NOT require an APPROVED membership",
  !/state\.company\.status\s*(===|!==)\s*["']APPROVED["']/.test(onboarding)
);
check(
  "GUARD 1 — the moved name check survives as its own gap",
  /!state\.company\.defined\) gaps\.push/.test(onboarding)
);
check(
  "GUARD 1 — `bound` means ANY membership, not an approved one",
  /bound:\s*p\.companyMemberships\.length > 0/.test(onboarding)
);

// ---------------------------------------------------------------------------
// GUARD 2 — CompanyMembership is written in exactly two places
// ---------------------------------------------------------------------------

/*
  ⚠ CREATION, NOT EVERY WRITE — and the distinction is the point.

  The first version of this counted `update` too and found THREE sites. The third
  is `decideRequest`, an admin approving or rejecting a membership that a human
  already requested: a STATUS TRANSITION on an existing attestation, gated on the
  actor administering that company. That is legitimate and pre-existing.

  What must stay at two is the number of ways a membership can COME INTO
  EXISTENCE, because that is the act nobody else can perform on your behalf.
*/
const MEMBERSHIP_CREATE = /companyMembership\.(create|createMany|upsert)/;
const MEMBERSHIP_WRITE = /companyMembership\.(create|createMany|upsert|update|updateMany|delete|deleteMany)/;
/*
  ⚠ APPLICATION CODE ONLY. `prisma/` is scanned for MINTING (below) but excluded
  here: the one historical backfill legitimately writes memberships and is named
  there. Keeping the two questions apart is what lets each be strict.
*/
const writers = [...bodies.entries()]
  .filter(([f]) => f.startsWith("src"))
  .filter(([, b]) => MEMBERSHIP_WRITE.test(b))
  .map(([f]) => f);
check(
  "GUARD 2 — in application code, only lib/company.ts writes a CompanyMembership",
  writers.length === 1 && writers[0] === COMPANY_LIB,
  writers.join(", ") || "nobody"
);

const companyLibRaw = readFileSync(COMPANY_LIB, "utf8");
const stripped = strip(companyLibRaw);
/*
  ⚠ AND ONLY THE TWO NAMED FUNCTIONS INSIDE IT. Counting the write sites is what
  catches a third path being added to the same file — which is the likelier
  version of this mistake than a whole new file.
*/
const createSites = (stripped.match(/companyMembership\.(create|createMany|upsert)/g) ?? []).length;
check(
  "GUARD 2 — exactly two ways a membership can be CREATED",
  createSites === 2,
  `${createSites} found — defineCompany and joinCompany are the only two attestations a human makes`
);
/*
  ⚠ AND ANY STATUS TRANSITION IS BEHIND AN ADMIN CHECK. `decideRequest` may flip
  PENDING → APPROVED, and the thing that makes that safe is `actorIsAdmin`; a
  transition without it would be a membership granted by whoever asked.
*/
const updateSites = (stripped.match(/companyMembership\.(update|updateMany|delete|deleteMany)/g) ?? []).length;
check(
  "GUARD 2 — the one status-transition site is gated on the actor being an admin",
  updateSites === 0 ||
    /actorIsAdmin[\s\S]{0,400}companyMembership\.update/.test(stripped),
  `${updateSites} transition site(s)`
);
for (const fn of ["defineCompany", "joinCompany"]) {
  check(
    `GUARD 2 — ${fn} is one of them`,
    new RegExp(`export async function ${fn}\\(`).test(stripped)
  );
}
/*
  ⚠ NO BACKFILL EVER MINTS ONE. A membership is an attestation a human made;
  manufacturing one silently binds a person to a company they never claimed.
*/
/**
 * ⚠ ONE HISTORICAL BACKFILL EXISTS, AND DECLARING IT IS THE POINT.
 *
 * `prisma/backfill-memberships.ts` (brief_company_model WS1) mints memberships
 * from `Person.company_id` — precisely the act this brief says not to perform,
 * written before this brief existed and for a defensible reason at the time
 * ("that binding was real, it just wasn't recorded as a decision").
 *
 * It is NOT deleted here: it is a documented historical migration, out of scope,
 * and it is its own npm script rather than part of any automatic seed. It IS
 * named, so the exception cannot quietly grow — the same shape as
 * `UNWEIGHTED_DOMAINS` in `check:assessment`.
 *
 * ⚠ AND IT IS A LIVE HAZARD, reported rather than papered over: re-running it
 * today would bind every person who has only a placeholder `company_id` to that
 * placeholder, silently, as APPROVED.
 */
const KNOWN_MINT = join("prisma", "backfill-memberships.ts");
const seedWriters = [...bodies.entries()]
  .filter(([f]) => f.startsWith("prisma") || f.startsWith("scripts"))
  .filter(([, b]) => MEMBERSHIP_CREATE.test(b))
  .map(([f]) => f);
check(
  "GUARD 2 — no NEW seed or script mints a membership",
  seedWriters.length === 1 && seedWriters[0] === KNOWN_MINT,
  seedWriters.filter((f) => f !== KNOWN_MINT).join(", ") ||
    "the one known historical backfill is missing — if it was deleted, delete this assertion too"
);
check(
  "GUARD 2 — and that backfill is not wired into an automatic seed",
  !/backfill-memberships/.test(bodies.get(join("prisma", "seed.ts")) ?? "")
);

// ---------------------------------------------------------------------------
// GUARD 3 — /company's no-binding branch renders the form
// ---------------------------------------------------------------------------

check(
  "GUARD 3 — the no-binding branch renders CompanyStepInline",
  /if \(!binding\)[\s\S]{0,2000}<CompanyStepInline/.test(companyPage),
  "a link to /join is a signpost, not a door"
);
check(
  "GUARD 3 — and the blocked reason still renders above it",
  /if \(!binding\)[\s\S]{0,1200}blockedMessage[\s\S]{0,600}<CompanyStepInline/.test(companyPage)
);
/*
  ⚠ THE PAGE THAT CLEARS THE BLOCK MUST NOT BE BEHIND THE BLOCK. This is the
  single assertion that would have prevented the whole trap.
*/
check(
  "GUARD 3 — /company never calls the transact guard",
  !/guardTransact|checkTransact/.test(companyPage)
);
check(
  "GUARD 3 — the inline wrapper reuses CompanyStep rather than forking a form",
  /import \{ CompanyStep[,\s}]/.test(bodies.get(INLINE) ?? "")
);
/* The redirect target is validated — `from` arrives in a query string. */
check(
  "GUARD 3 — `from` is validated against an open redirect",
  /\^\\\/\(\?!\\\/\)/.test(bodies.get(INLINE) ?? ""),
  "a bare startsWith('/') lets //evil.com through"
);
check(
  "GUARD 3 — the wizard no longer bounces a completed, UNBOUND requester",
  /s\.completed && !s\.company\?\.bound/.test(steps)
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:company-binding — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:company-binding — ${pass}/${pass} passed`);
