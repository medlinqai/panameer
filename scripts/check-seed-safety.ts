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

const APPROVED_PERSONAS: { email: string; why: string }[] = [
  { email: "admin@panameer.com", why: "the only admins entry — a seeded database would have no admin without it" },
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
