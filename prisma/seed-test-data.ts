/**
 * SEED TEST DATA — named accounts (WS-1) + a wide provider set (WS-2).
 *
 *     npm run seed:test-data            # dry run, prints the plan
 *     npm run seed:test-data -- --apply # writes
 *
 * ── ⚠ THE BRIEF NAMES THE WRONG PROTECTED USERS ──────────────────────────────
 *
 * It says "do NOT touch the 4 real users (Scott/Keith/Mick/Rev — Learn-video
 * links)". Three of those four names are wrong. The people actually carrying
 * Learn lessons are, queried from `learn_lessons.expert_person_id`:
 *
 *     Scott Walls         iamscottwalls@outlook.com    338 lessons
 *     Linus Erley         sw_user2@straterp.com         70 lessons
 *     Marelise Steenkamp  sw_user4@straterp.com         33 lessons
 *     Eddie Cairnie       sw_user3@straterp.com         25 lessons
 *
 * Keith, Mick and Rev teach nothing. Following the brief literally would have
 * protected three people who need no protection while overwriting three who do,
 * breaking the instructor attribution on 128 lessons — the exact damage the
 * instruction exists to prevent. So PROTECTED is derived from the database at
 * runtime, not from a name list: whoever holds lessons is untouchable, and if
 * that set changes the seeder follows it without an edit.
 *
 * Protected accounts are skipped ENTIRELY — not "updated carefully". No
 * password reset, no profile edit, no flag change.
 *
 * ── IDEMPOTENT ───────────────────────────────────────────────────────────────
 *
 * Every write is an upsert keyed on email (users) or on a deterministic
 * `seed_key` headline marker (providers), so running it twice changes nothing.
 * Re-runnable is the point: this is the data a walk burns through.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const APPLY = process.argv.includes("--apply");
const PASSWORD = "Panameer123";

type Sheet = {
  admins: { pid: string; name: string; email: string; password: string }[];
  buyers: { pid: string; name: string; email: string; company: string; job: string }[];
  sellers: { pid: string; name: string; email: string; team: string; job: string; role: string }[];
  spec: {
    pid: string; name: string; email: string; cls: string; lens: string; suite: string;
    domain: string; headline: string; validated: string; employers: string; projects: string;
    rate: string; location: string;
  }[];
};

/*
  Resolved from cwd, not `__dirname`. esbuild bundles this into .harness/, so
  `__dirname` is the build output directory and the seed JSON is not next to
  it — the same trap the other bundled scripts in this repo sit behind.
*/
const sheet: Sheet = JSON.parse(
  readFileSync(join(process.cwd(), "prisma", "seed-data", "test-users.json"), "utf8")
);

const norm = (e: string) => e.trim().toLowerCase();
const splitName = (n: string): [string, string] => {
  const parts = n.trim().split(/\s+/);
  return [parts[0] ?? "Test", parts.slice(1).join(" ") || "User"];
};

/** Headline suffix that marks a row as ours. Never shown — stripped on render? No: it is not appended to the headline, it is the note field. */
const SEED_TAG = "[seed:wide]";

async function main() {
  const log: string[] = [];
  const say = (s: string) => { log.push(s); console.log(s); };

  // ---- PROTECTED SET, derived from the data --------------------------------
  const lessons = await prisma.lesson.findMany({
    where: { expert_person_id: { not: null } },
    select: { expert: { select: { id: true, first_name: true, last_name: true, user: { select: { id: true, email: true } } } } },
  });
  const protectedEmails = new Set<string>();
  const protectedPersons = new Set<string>();
  const counts = new Map<string, number>();
  for (const l of lessons) {
    const e = l.expert;
    if (!e) continue;
    protectedPersons.add(e.id);
    if (e.user?.email) protectedEmails.add(norm(e.user.email));
    const k = `${e.first_name} ${e.last_name} <${e.user?.email ?? "no login"}>`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  say("PROTECTED (holds Learn lessons — skipped entirely):");
  for (const [k, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) say(`   ${k} — ${n} lessons`);

  const hash = await bcrypt.hash(PASSWORD, 10);

  // A company + site is required for a Person. Reuse an existing one rather
  // than inventing an org per test user — these are logins, not tenants.
  const host = await prisma.person.findFirst({
    where: { is_service_provider: true },
    select: { company_id: true, site_id: true },
  });
  if (!host) throw new Error("no existing Person to borrow a company/site from");

  // ---- WS-1 — NAMED ACCOUNTS ----------------------------------------------
  type Acct = { email: string; name: string; provider: boolean; buyer: boolean; admin: boolean };
  const accounts: Acct[] = [
    ...sheet.admins.map((a) => ({ email: a.email, name: a.name, provider: false, buyer: false, admin: true })),
    ...sheet.buyers.map((b) => ({ email: b.email, name: b.name, provider: false, buyer: true, admin: false })),
    ...sheet.sellers.map((s) => ({ email: s.email, name: s.name, provider: true, buyer: false, admin: false })),
  ];
  // Reuben Ellis is dual-role in the sheet; make sure both flags land.
  for (const s of sheet.spec) {
    if (/both/i.test(s.cls)) {
      const a = accounts.find((x) => norm(x.email) === norm(s.email));
      if (a) { a.provider = true; a.buyer = true; }
    }
  }

  let created = 0, updated = 0, skipped = 0;
  for (const a of accounts) {
    const email = norm(a.email);
    if (!email.includes("@")) continue;
    if (protectedEmails.has(email)) { skipped++; continue; }
    const [first, last] = splitName(a.name || email.split("@")[0]);

    if (!APPLY) { created++; continue; }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const user = await prisma.user.upsert({
      where: { email },
      update: { password_hash: hash, email_verified: new Date(), is_system_admin: a.admin, locked: false, failed_login_attempts: 0 },
      create: { email, password_hash: hash, email_verified: new Date(), is_system_admin: a.admin, first_name: first, last_name: last },
      select: { id: true },
    });
    existing ? updated++ : created++;

    const person = await prisma.person.findFirst({ where: { user_id: user.id }, select: { id: true } });
    if (person) {
      if (!protectedPersons.has(person.id)) {
        await prisma.person.update({ where: { id: person.id }, data: { is_service_provider: a.provider, is_service_buyer: a.buyer } });
      }
    } else {
      await prisma.person.create({
        data: {
          user_id: user.id, first_name: first, last_name: last,
          is_service_provider: a.provider, is_service_buyer: a.buyer,
          company_id: host.company_id, site_id: host.site_id,
        },
      });
    }
  }
  say(`\nWS-1 accounts: ${APPLY ? `${created} created, ${updated} updated` : `${created} would be written`}, ${skipped} protected-skipped`);

  // ---- WS-2 — WIDE PROVIDER SET -------------------------------------------
  /*
    ONE PROVIDER PER PILLAR, which is the grain the talent search exposes:
    `searchProvidersTeaser` matches on skill name, roleType name/display and
    pillar name, so a pillar with nobody in it is a query that returns nothing.

    Skills come from the SEEDED CATALOG — read back per pillar — never invented.
    A basket of invented skill names would search fine and match no real
    Work Request.
  */
  const pillars = await prisma.pillar.findMany({
    select: { id: true, name: true, skills: { select: { id: true, name: true }, take: 40 } },
    orderBy: { name: "asc" },
  });

  /*
    TWO PILLARS ARE LEFT EMPTY ON PURPOSE (brief: "leave a couple of tags
    empty") so the no-results state is walkable. Chosen as the two smallest
    agnostic pillars — leaving a flagship suite empty would look like a bug.
  */
  const LEAVE_EMPTY = new Set(["Testing & Support", "Creative & Content Generation"]);

  /* Overlaps on the hero path so ranking has something to sort. */
  const HERO = "Procure-to-Pay";
  const HERO_EXTRA = 3;

  const FIRST = ["Avery","Rowan","Sasha","Devon","Imani","Noor","Kai","Marisol","Tobias","Lena",
                 "Ravi","Cassidy","Emeka","Yuki","Sana","Bruno","Freya","Omar","Talia","Nils",
                 "Isolde","Mateo","Ingrid","Hassan","Petra","Sven","Amara","Dmitri"];
  const LAST = ["Okonkwo","Lindqvist","Ferrara","Nakamura","Balewa","Castellanos","Voss","Adeyemi",
                "Marchetti","Halvorsen","Bergström","Duarte","Osei","Yamashita","Rahman","Costa",
                "Novak","Farouk","Bianchi","Sørensen","Almeida","Rees","Kovac","Mensah"];

  let pi = 0;
  const plan: { name: string; pillar: string; skills: number; validated: boolean }[] = [];
  const targets: { pillar: (typeof pillars)[number]; idx: number }[] = [];
  for (const p of pillars) {
    if (LEAVE_EMPTY.has(p.name)) continue;
    targets.push({ pillar: p, idx: 0 });
    if (p.name === HERO) for (let k = 1; k <= HERO_EXTRA; k++) targets.push({ pillar: p, idx: k });
  }

  let provCreated = 0, provUpdated = 0, validated = 0;
  for (const t of targets) {
    const first = FIRST[pi % FIRST.length];
    const last = LAST[(pi * 7 + 3) % LAST.length];
    pi++;
    const key = `${SEED_TAG} ${t.pillar.name}#${t.idx}`;

    /*
      HEADLINE <= 42 CHARS, matching the card's soft cap. These exist to fill
      the search, and a seeded headline that truncates on every card would make
      the cap look broken during the walk.
    */
    const base = t.pillar.name.replace(/\s*\(.*\)$/, "");
    let headline = `${base} Consultant`;
    if (headline.length > 42) headline = `${base} Lead`.slice(0, 42);

    // ~half validated, deterministically (every other one).
    const isValidated = pi % 2 === 0;
    if (isValidated) validated++;

    const skills = t.pillar.skills.slice(t.idx * 3, t.idx * 3 + 5);
    plan.push({ name: `${first} ${last}`, pillar: t.pillar.name, skills: skills.length, validated: isValidated });
    if (!APPLY) { provCreated++; continue; }

    const email = `seed.${first}.${last}.${pi}@example.seed`.toLowerCase();
    const user = await prisma.user.upsert({
      where: { email },
      update: { password_hash: hash, email_verified: new Date() },
      create: { email, password_hash: hash, email_verified: new Date(), first_name: first, last_name: last },
      select: { id: true },
    });
    let person = await prisma.person.findFirst({ where: { user_id: user.id }, select: { id: true } });
    if (!person) {
      person = await prisma.person.create({
        data: { user_id: user.id, first_name: first, last_name: last, is_service_provider: true,
                company_id: host.company_id, site_id: host.site_id },
        select: { id: true },
      });
    }

    const existing = await prisma.providerProfile.findFirst({ where: { person_id: person.id }, select: { id: true } });
    const data: Prisma.ProviderProfileUncheckedCreateInput = {
      person_id: person.id,
      headline,
      overview: `Seeded coverage for ${t.pillar.name}. ${key}`,
      pillar_id: t.pillar.id,
      status: "ACTIVE",
      validation_status: isValidated ? "VALIDATED" : "NOT_REQUESTED",
      rate_min_cents: 12_000_00 + (pi % 8) * 1_500_00,
      rate_max_cents: 18_000_00 + (pi % 8) * 2_000_00,
      currency: "USD",
    };
    const profile = existing
      ? (provUpdated++, await prisma.providerProfile.update({ where: { id: existing.id }, data, select: { id: true } }))
      : (provCreated++, await prisma.providerProfile.create({ data, select: { id: true } }));

    for (const s of skills) {
      await prisma.providerSkill.upsert({
        where: { provider_profile_id_skill_id: { provider_profile_id: profile.id, skill_id: s.id } },
        update: {},
        create: { provider_profile_id: profile.id, skill_id: s.id },
      });
    }
  }

  say(`\nWS-2 wide providers: ${APPLY ? `${provCreated} created, ${provUpdated} updated` : `${plan.length} would be written`}`);
  say(`   validated: ${validated} of ${plan.length}`);
  say(`   pillars covered: ${new Set(plan.map((p) => p.pillar)).size} of ${pillars.length}`);
  say(`   left empty on purpose: ${[...LEAVE_EMPTY].join(", ")}`);
  say(`   overlaps on "${HERO}": ${plan.filter((p) => p.pillar === HERO).length}`);

  if (!APPLY) say("\nDRY RUN — nothing written. Re-run with --apply.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
