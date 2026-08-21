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
 * ⚠ ONE HISTORICAL BACKFILL EXISTS, IT IS NOW RETIRED, AND DECLARING IT IS THE POINT.
 *
 * `prisma/_retired_backfill-memberships.ts` (brief_company_model WS1) mints
 * memberships from `Person.company_id` — precisely the act that brief says not to
 * perform, written before it existed and for a defensible reason at the time
 * ("that binding was real, it just wasn't recorded as a decision").
 *
 * ⚠ RETIRED 2026-08-21 BY SCOTT ("retire it.") — `brief_buyer_side_cleanup` WS1.
 * It was a LIVE HAZARD: running it today would mint 64 APPROVED memberships for
 * people who never claimed those companies, 51 of them onto one untyped company,
 * and make one of them ADMIN over 52 others by accident of signup order.
 *
 * It is NOT deleted: it is the written record of a migration that really ran and
 * of the rows that exist because of it. It is renamed with a `_retired_` prefix,
 * it exits non-zero before any query, and its npm script is gone — all three are
 * asserted below. It IS still named here, so the exception cannot quietly grow —
 * the same shape as `UNWEIGHTED_DOMAINS` in `check:assessment`.
 */
const KNOWN_MINT = join("prisma", "_retired_backfill-memberships.ts");
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
// GUARD 2b — the retired backfill is RETIRED, not merely renamed
// (brief_buyer_side_cleanup WS3)
// ---------------------------------------------------------------------------

/*
  ⚠ REMOVING THE npm SCRIPT IS THE PART THAT ACTUALLY REMOVES THE HAZARD — the
  danger was a one-line command, not the file. `pkg` is read RAW, not stripped,
  because JSON has no comments to strip and `strip()` would mangle the `//` in a
  URL if one ever appeared in there.
*/
const pkg = readFileSync("package.json", "utf8");
const mintScripts = Object.entries(
  (JSON.parse(pkg) as { scripts?: Record<string, string> }).scripts ?? {}
).filter(([name, cmd]) => /backfill-memberships/.test(name) || /backfill-memberships/.test(cmd));
check(
  "GUARD 2b — no package.json script invokes a membership-minting backfill",
  mintScripts.length === 0,
  mintScripts.map(([n]) => n).join(", ")
);

/*
  ⚠ AND THE FILE REFUSES TO RUN EVEN IF INVOKED DIRECTLY. A file that still
  executes is still a hazard: `npx tsx prisma/_retired_backfill-memberships.ts`
  does not care that the npm script is gone, and somebody will eventually type it.
  The refusal has to come BEFORE the first query, so this asserts `process.exit`
  appears ahead of every `prisma.` call in the file — position, not presence.
*/
const retired = bodies.get(KNOWN_MINT) ?? "";
const exitAt = retired.indexOf("process.exit(1)");
const firstQueryAt = retired.search(/prisma\.[a-zA-Z]+\.(findMany|findFirst|findUnique|create|count|update|delete)/);
check(
  "GUARD 2b — the retired backfill calls process.exit(1)",
  exitAt >= 0,
  "removing the exit turns a documented record back into a loaded gun"
);
check(
  "GUARD 2b — and it exits BEFORE any query, not after one",
  exitAt >= 0 && (firstQueryAt === -1 || exitAt < firstQueryAt),
  `exit@${exitAt} firstQuery@${firstQueryAt}`
);
check(
  "GUARD 2b — the retired file is the guard's single named exception, by its new path",
  bodies.has(KNOWN_MINT) && /^prisma[/\\]_retired_/.test(KNOWN_MINT),
  KNOWN_MINT
);

/*
  ⚠ THE MEMBERSHIP-WRITE SCAN COVERS `prisma/` — asserted, not assumed.

  The first version of this guard walked only `src/` and `scripts/`, and a
  membership-minting backfill dropped into `prisma/` sailed through it. That is
  precisely where this defect arrives, so the coverage itself is now a check
  rather than a comment: if somebody narrows the walk, this fails.
*/
check(
  "GUARD 2b — the scan actually covers prisma/, src/ and scripts/",
  ["prisma", "src", "scripts"].every((d) => files.some((f) => f.startsWith(d + "/") || f.startsWith(d + "\\"))),
  files.length + " files walked"
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
// GUARD 4 — no /join refusal dead-ends on /dashboard
// (brief_buyer_side_cleanup WS2 + WS3, P1-J1.2-E009)
// ---------------------------------------------------------------------------

/*
  ⚠ THE DEAD END WAS THE DEFECT, NOT THE WORDING.

  `/join/buyer` and `/join/requester` told a signed-in person "This account isn't
  a buyer account" and offered ONE link, to `/dashboard`. That is aimed at
  somebody who is on `/join/buyer` TRYING TO BECOME A BUYER, and it re-opened one
  hop later the exact loop `P1-J1.2-E004` had just closed at `/company`.

  So this asserts the SHAPE — a refusal must offer a door that is not
  `/dashboard` — rather than the sentence, which is free to be re-worded.
*/
const REFUSAL = join("src", "components", "onboarding", "NoProfileYet.tsx");
const JOIN_BUYER = join("src", "app", "join", "buyer", "page.tsx");
const JOIN_REQ = join("src", "app", "join", "requester", "page.tsx");
const JOIN_FORK = join("src", "app", "join", "page.tsx");
for (const f of [REFUSAL, JOIN_BUYER, JOIN_REQ, JOIN_FORK]) {
  check(`the file this guard is about exists: ${f}`, bodies.has(f));
}
const refusal = bodies.get(REFUSAL) ?? "";
const fork = bodies.get(JOIN_FORK) ?? "";

check(
  "GUARD 4 — the refusal screen offers /company, not only /dashboard",
  /href=\{companyHref\}/.test(refusal) && /"\/company"/.test(refusal) && /"\/dashboard"/.test(refusal),
  "a refusal whose only door is /dashboard is the trap this closed"
);
check(
  "GUARD 4 — and /company is the PRIMARY link — it comes before /dashboard",
  refusal.indexOf("companyHref") < refusal.indexOf('"/dashboard"')
);
check(
  "GUARD 4 — the refusal carries ?blocked= and ?from= back to /company",
  /qs\.set\("blocked"/.test(refusal) && /qs\.set\("from"/.test(refusal),
  "dropping them lands the visitor on a bare company page with no memory of why"
);
for (const [name, body] of [["buyer", bodies.get(JOIN_BUYER) ?? ""], ["requester", bodies.get(JOIN_REQ) ?? ""]] as const) {
  check(
    `GUARD 4 — /join/${name} renders the shared refusal instead of its own dead end`,
    /<NoProfileYet/.test(body)
  );
  /*
    ⚠ THE OLD SENTENCE IS BANNED BY SHAPE: any claim about what KIND of account
    this is. The 404 cannot establish that — see NoProfileYet's header — so a
    string asserting it is a guess, and it was the wrong guess for the person
    most likely to read it.
  */
  check(
    `GUARD 4 — /join/${name} no longer claims to know what kind of account this is`,
    !/isn.t a (buyer|requester|provider) account/i.test(body),
    "the status route collapses several causes into one 404"
  );
}
/*
  ⚠ THE RESUME REDIRECT IS THE ONE THAT MATTERS. `/join/buyer` is unreachable
  from the manual fork (`P1-J1.2-E005`), so the only way a signed-in buyer-side
  account lands on it is `/join`'s auto-resume — and that dropped the context.
*/
check(
  "GUARD 4 — /join carries the blocked context through its resume redirects",
  /router\.replace\(withCtx\("\/join\/buyer"\)\)/.test(fork) &&
    /router\.replace\(withCtx\("\/join\/requester"\)\)/.test(fork),
  "without this the ?blocked= reason never reaches the screen that needs it"
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:company-binding — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:company-binding — ${pass}/${pass} passed`);
