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
import { SURVIVORS } from "../prisma/reset/survivors-spec";

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
  ── ⚠⚠⚠ KNOWN-OPEN — FOUR SEEDED PERSONAS THAT ARE ALSO SURVIVORS ─────────

  ⚠ THE RULE BELOW IS ASSERTED IN FULL, AND IT CURRENTLY FINDS FOUR MORE
  ADDRESSES BESIDES SCOTT'S. They are NOT the same kind of thing, which is why
  they are listed rather than deleted:

    `iamscottwalls@outlook.com`  a REAL PERSON'S PERSONAL ADDRESS  → REMOVED
    `sw_user2/3/4@straterp.com`  seeded personas that hold lessons → known-open
    `admin@panameer.com`         the seeded admin (named "Scott Walls") → known-open

  ⚠⚠ REMOVING THE OTHER FOUR HAS A CONSEQUENCE AND IS SCOTT'S CALL:
  `admin@panameer.com` is the ONLY entry in the `admins` group, and the seed
  creates the system admin from it — **delete it and a fresh database has no
  admin at all.** ⚠ The three `sw_user` personas are the virtual-firm cast the
  demo data is built around.

  ⚠⚠⚠ THE TWO SAFEGUARDS THAT MAKE A KNOWN-OPEN SAFE, BOTH REQUIRED (the
  `check:email` pattern):
    1. **A KNOWN-OPEN ENTRY THAT STARTS *PASSING* FAILS THE GATE**, so it cannot
       rot silently once somebody does remove one.
    2. **EACH CARRIES THE DATE IT WAS OPENED AND ITS AGE IS PRINTED EVERY RUN**,
       so this cannot become a parking lot.
  ⚠ Scott's own address is deliberately NOT here: it is enforced hard.
*/
const KNOWN_OPEN: { email: string; since: string; why: string }[] = [
  { email: "sw_user2@straterp.com", since: "2026-09-23", why: "seeded persona, holds Learn lessons" },
  { email: "sw_user3@straterp.com", since: "2026-09-23", why: "seeded persona, holds Learn lessons" },
  { email: "sw_user4@straterp.com", since: "2026-09-23", why: "seeded persona, holds Learn lessons" },
  { email: "admin@panameer.com", since: "2026-09-23", why: "the ONLY admins entry — removing it leaves a fresh database with no admin" },
];
const KNOWN = new Set(KNOWN_OPEN.map((k) => k.email.toLowerCase()));
const ageDays = (iso: string) =>
  Math.floor((Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86_400_000);

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

  /* ── 1 · NO SURVIVOR IS IN THE FILE ───────────────────────────────────── */
  const survivorEmails = SURVIVORS.map((s) => s.email.toLowerCase().trim());
  check(
    "1 — ⚠⚠ the survivors list is non-empty (E586)",
    survivorEmails.length > 0,
    `${survivorEmails.length}`
  );
  const survivorHits = survivorEmails.filter((e) => seeded.has(e) && !KNOWN.has(e));
  check(
    "1 — ⚠⚠⚠ no SURVIVOR address appears in test-users.json",
    survivorHits.length === 0,
    survivorHits.join(", ")
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
  const protectedHits = protectedEmails.filter((e) => seeded.has(e) && !KNOWN.has(e));
  check(
    "2 — ⚠⚠⚠ no PROTECTED (lesson-holding) address appears in test-users.json",
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

  /* ── ⚠⚠ THE KNOWN-OPEN LEDGER, PRINTED EVERY RUN ───────────────────────── */
  const stillThere = KNOWN_OPEN.filter((k) => seeded.has(k.email.toLowerCase()));
  const fixed = KNOWN_OPEN.filter((k) => !seeded.has(k.email.toLowerCase()));
  for (const k of stillThere) {
    console.log(`check:seed-safety — KNOWN OPEN (${ageDays(k.since)}d): ${k.email} — ${k.why}`);
  }
  /* ⚠⚠⚠ A KNOWN-OPEN THAT STARTS PASSING FAILS THE GATE. Somebody removed the
     address and did not remove the exemption; leaving it would let the next
     regression hide behind a stale entry. */
  check(
    "4 — ⚠⚠⚠ no KNOWN-OPEN entry has been quietly fixed (remove it from the list)",
    fixed.length === 0,
    fixed.map((k) => k.email).join(", ")
  );

  console.log(
    `check:seed-safety — ${seeded.size} seeded addresses · ${survivorEmails.length} survivors · ${protectedEmails.length} protected · ${skipSites}/3 generator sites`
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
