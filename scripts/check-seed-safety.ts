/**
 * `check:seed-safety` — no real account is in the test-user file
 * (`P2-A2-E603`). `npm run check:seed-safety`.
 *
 * ── ⚠⚠⚠ WHAT THIS EXISTS TO STOP ─────────────────────────────────────────
 *
 * ⚠ **SCOTT'S REAL ACCOUNT WAS IN `prisma/seed-data/test-users.json`, WITH A
 * PASSWORD.** `seed-test-data.ts` upserts `password_hash` for every entry in
 * that file, so a seed run would have overwritten a real person's password.
 *
 * ⚠⚠ IT DID NOT, AND THE REASON IS THE POINT: line 358 skips the PROTECTED set
 * before the upsert, and protected is derived from the database at run time —
 * whoever holds `learn_lessons.expert_person_id` (load-bearing rule 10).
 * ⚠⚠⚠ **THAT GUARD IS CONDITIONAL. The day he stops holding a lesson, the
 * derivation stops protecting him and the seed rewrites his password.**
 * ⚠ Proven working on 2026-09-23 — his stored hash did NOT match the seed
 * password while a control account's did — and that proof is exactly why the
 * file, not the guard, is the thing to fix. **A protection that depends on an
 * unrelated fact staying true is a protection with an expiry date nobody set.**
 *
 * ── ⚠⚠ TWO SETS, AND BOTH ARE DERIVED, NEITHER IS TYPED HERE (`E587`) ─────
 *
 * ⚠ **SURVIVORS** comes from `prisma/reset/survivors-spec.ts` — the accounts
 * Scott confirmed the reset must keep. They are real people by definition.
 * ⚠⚠ **THE PROTECTED SET COMES FROM THE DATABASE**, the same way `seed-test-data`
 * derives it, because rule 10 is explicit: *"derive the protected set from the
 * DB at runtime — NEVER from a name list in a brief."* ⚠ A gate that hardcoded
 * the four names would go stale the moment a fifth person taught a lesson, and
 * would be asserting about a list rather than about the rule.
 *
 * ⚠ **THE GENERATOR IS CHECKED TOO.** `test-users.json` is BUILT from
 * `Users.xlsx` by `scripts/build-test-users.py`, so deleting a row from the JSON
 * is undone by the next regeneration. ⚠⚠ **A FIX THAT THE NEXT BUILD UNDOES IS
 * NOT A FIX** — the generator must carry the exclusion, and that is asserted.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/*
  ── ⚠⚠⚠ HOW YOU TELL A SEEDED PERSONA FROM A REAL PERSON ──────────────────

  ⚠⚠⚠ **YOU CANNOT, FROM THE DATA. THAT IS THE HONEST ANSWER AND IT SHAPES THIS
  WHOLE GATE.** A seeded persona and a real human's account are the same rows:
  a `User` with an email and a hash, a `Person`, sometimes a provider profile.
  ⚠ Nothing in the schema records *"a human owns this and chose this password."*
  ⚠⚠ A DOMAIN RULE WOULD BE A GUESS — `@panameer.com` holds both the seeded
  admin and real staff addresses, and a real tester on `@straterp.com` would be
  waved straight through.

  ⚠ **SO THE DISTINCTION IS A NAMED LIST, AND IT IS SAID OUT LOUD RATHER THAN
  DISGUISED AS A HEURISTIC.** Two lists, each short, each commented:

  ⚠⚠ **1. `REAL_ACCOUNTS` — AND IT IS NOT DECLARED HERE.** It lives in
  `scripts/build-test-users.py`, the GENERATOR, and this gate parses it back
  out. ⚠⚠⚠ ONE DEFINITION, NOT TWO: a second copy here is `E585`'s shape — one
  concept stated twice and kept in step by hand — and it is the exact mistake
  this brief has already paid for three times.

  ⚠⚠ **2. `APPROVED_PERSONAS` — seeded cast that legitimately belongs in the
  file**, even though they are SURVIVORS and hold Learn lessons.
  ⚠ SCOTT'S RULE, 2026-09-23: *"A seeded persona MAY appear in
  test-users.json. A real person's account MAY NOT."*

  ── ⚠⚠ AND THE DERIVATION STILL GUARDS THE GENERAL CASE ───────────────────

  ⚠ The named list only knows about today's people. ⚠⚠⚠ SO THE PROTECTED SET IS
  STILL DERIVED FROM THE DATABASE AND STILL ASSERTED — **any protected account
  in the file that is NOT an approved persona fails.** That is what catches the
  NEXT real person who starts teaching a lesson, without anyone remembering to
  add them anywhere.
  ⚠ SUPERSEDED, quoted not deleted (`E164`) — the first version asserted that no
  SURVIVOR appears in the file at all:
  //   const survivorHits = survivorEmails.filter((e) => seeded.has(e));
  //   check("1 — no SURVIVOR address appears in test-users.json", …)
  ⚠⚠ **THAT WAS WRONG AND SCOTT RULED IT SO: THREE SURVIVORS BELONG IN THAT FILE
  BY DESIGN.** Survivorship says "the reset must keep this row", not "a human
  owns it" — they are different questions and the gate was asking the wrong one.
*/
const APPROVED_PERSONAS: { email: string; why: string }[] = [
  /* ⚠⚠⚠ `admin@panameer.com` IS THE **ONLY** ENTRY IN THE `admins` GROUP, and
     the seed creates the system admin from it. ⚠ REMOVING IT LEAVES A FRESHLY
     SEEDED DATABASE WITH NO ADMIN AT ALL — a worse failure than the one this
     gate guards against. ⚠⚠ DO NOT "TIDY" THIS AWAY. Scott, 2026-09-23. */
  { email: "admin@panameer.com", why: "the only admins entry — a seeded database would have no admin without it" },
  /* ⚠ The virtual-firm cast the demo data is built around. They hold Learn
     lessons, which is why they are protected, but they are personas. */
  { email: "sw_user2@straterp.com", why: "virtual-firm cast (Linus Erley)" },
  { email: "sw_user3@straterp.com", why: "virtual-firm cast (Eddie Cairnie)" },
  { email: "sw_user4@straterp.com", why: "virtual-firm cast (Marelise Steenkamp)" },
];
const APPROVED = new Set(APPROVED_PERSONAS.map((p) => p.email.toLowerCase()));

const SEED_FILE = join("prisma", "seed-data", "test-users.json");
const GENERATOR = join("scripts", "build-test-users.py");

async function main() {
  /* ── the addresses the seed file actually carries ──────────────────────── */
  const raw = JSON.parse(readFileSync(SEED_FILE, "utf8")) as Record<string, unknown>;
  const seeded = new Set<string>();
  for (const group of Object.values(raw)) {
    if (!Array.isArray(group)) continue;
    for (const row of group as { email?: string }[]) {
      if (row?.email) seeded.add(row.email.toLowerCase().trim());
    }
  }
  /* ⚠⚠ `E586` — AN EMPTY FILE WOULD SATISFY EVERY "IS ABSENT" CHECK BELOW.
     The count comes first so the gate cannot pass by having nothing to read. */
  check("0 — ⚠⚠ the seed file has accounts to check (E586)", seeded.size > 0, `${seeded.size}`);
  if (seeded.size === 0) return;

  /* ── 1 · NO **REAL ACCOUNT** IS IN THE FILE ───────────────────────────── */
  /* ⚠⚠ PARSED OUT OF THE GENERATOR — one definition, not two (`E585`). */
  const genSrc = readFileSync(GENERATOR, "utf8");
  const block = genSrc.match(/REAL_ACCOUNTS\s*=\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const realAccounts = [...block.matchAll(/"([^"]+@[^"]+)"/g)].map((m) => m[1].toLowerCase().trim());
  check(
    "1 — ⚠⚠ REAL_ACCOUNTS was readable from the generator (E586)",
    realAccounts.length > 0,
    `${realAccounts.length}`
  );
  const realHits = realAccounts.filter((e) => seeded.has(e));
  check(
    "1 — ⚠⚠⚠ no REAL account appears in test-users.json",
    realHits.length === 0,
    realHits.join(", ")
  );

  /* ── 2 · NO PROTECTED ACCOUNT IS IN THE FILE ──────────────────────────── */
  /* ⚠⚠ DERIVED FROM THE DATABASE, NOT TYPED (rule 10). Same derivation the
     seed itself uses: whoever holds a Learn lesson. */
  const holders = await prisma.person.findMany({
    where: { learnLessons: { some: {} } },
    select: { user: { select: { email: true } } },
  });
  const protectedEmails = holders
    .map((h) => h.user?.email?.toLowerCase().trim())
    .filter((e): e is string => !!e);
  check(
    "2 — ⚠⚠ the protected set is non-empty (E586)",
    protectedEmails.length > 0,
    `${protectedEmails.length} lesson-holders`
  );
  /* ⚠⚠⚠ THE CANARY FOR THE NEXT REAL PERSON. An approved persona is allowed;
     anything else that is protected AND in the file is somebody nobody
     classified, and it fails before a seed run can reach their password. */
  const protectedHits = protectedEmails.filter((e) => seeded.has(e) && !APPROVED.has(e));
  check(
    "2 — ⚠⚠⚠ no UNAPPROVED protected account appears in test-users.json",
    protectedHits.length === 0,
    protectedHits.join(", ")
  );

  /* ── 3 · THE GENERATOR CARRIES THE EXCLUSION ──────────────────────────── */
  /* ⚠⚠⚠ WITHOUT THIS, THE FIX LASTS UNTIL THE NEXT REGENERATION. The JSON is
     built from `Users.xlsx`, where Scott legitimately appears as a provider —
     the roster is RIGHT; the test file is the wrong place for him. */
  const gen = readFileSync(GENERATOR, "utf8");
  check(
    "3 — ⚠⚠ the generator declares REAL_ACCOUNTS",
    /REAL_ACCOUNTS\s*=\s*\{/.test(gen)
  );
  const skipSites = (gen.match(/if email\.lower\(\) in REAL_ACCOUNTS: continue/g) ?? []).length;
  /* ⚠ THREE APPEND SITES — admins, buyers, sellers. A guard on two of three is
     a guard that leaks through the third, which is why this counts rather than
     merely testing for presence. */
  check(
    "3 — ⚠⚠⚠ every append site in the generator applies the exclusion",
    skipSites === 3,
    `${skipSites} of 3`
  );

  /* ── ⚠⚠ THE APPROVED LIST MUST STAY TRUE ──────────────────────────────── */
  /* ⚠⚠⚠ AN APPROVED PERSONA THAT IS NO LONGER IN THE FILE FAILS. Somebody
     removed the address and left the exemption behind; a stale entry is a hole
     the next real account could sit in unnoticed. */
  const gone = APPROVED_PERSONAS.filter((k) => !seeded.has(k.email.toLowerCase()));
  check(
    "4 — ⚠⚠⚠ every APPROVED persona is still in the file (remove stale exemptions)",
    gone.length === 0,
    gone.map((k) => k.email).join(", ")
  );

  console.log(
    `check:seed-safety — ${seeded.size} seeded addresses · ${protectedEmails.length} protected · ${skipSites}/3 generator sites`
  );
}

function report() {
  if (failures.length) {
    console.error(`\ncheck:seed-safety — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:seed-safety — ${pass}/${pass} passed`);
}

main()
  .then(report)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
