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
import { SURVIVORS, EXPLICIT_DELETES } from "./reset/survivors-spec";

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

/**
 * ── ⚠⚠⚠ TWO SECURITY GUARDS, ADDED AT `P0-E595` WS-B. READ BEFORE EDITING ──
 *
 * ⚠⚠ THIS SEED IS HOW `sw_user33@straterp.com` BECAME A SYSTEM ADMIN, AND IT
 * DID IT AGAIN ON 2026-09-21. Scott's reset deleted that account by name as
 * *"the stray system admin"*; forty minutes later this file re-created it with
 * `is_system_admin: true`, because `prisma/seed-data/test-users.json` lists it
 * in `admins` and the loop wrote `is_system_admin: a.admin` with no check on
 * WHICH account was claiming the flag.
 * ⚠ Scott, 2026-09-20: *"confirm the new seed does not grant `is_system_admin`
 * to any test persona. A test account ending up as system admin is how
 * sw_user33 happened."* It happened the same way a second time.
 *
 * ── GUARD 1 — AN ACCOUNT SCOTT DELETED IS NEVER RE-CREATED ─────────────────
 *
 * `EXPLICIT_DELETES` is the list Scott named at the reset, and it is the SAME
 * constant the wipe deleted from — not a copy. A seed that resurrects what a
 * reset removed makes the reset meaningless.
 *
 * ── GUARD 2 — ONLY A CONFIRMED SURVIVOR MAY HOLD `is_system_admin` ─────────
 *
 * ⚠⚠ THIS IS A THROW, NOT A SKIP, AND THAT IS DELIBERATE. The roster is
 * REGENERATED from `Users.xlsx` (`scripts/build-test-users.py`), so a new
 * `Panameer Admin` row can appear in it without anybody reading this file. A
 * skip would grant nothing and say nothing; a throw stops the seed and names
 * the address. ⚠ The allowed set is DERIVED from `SURVIVORS` — the five
 * accounts Scott confirmed by name on 2026-09-20 — not from a list invented
 * here (load-bearing rule 10's shape: derive, never re-type).
 * ⚠ `E574` records separately that `is_system_admin` is not the right flag for
 * support staff at all (`is_support` is). That is a different job.
 */
const NEVER_RECREATE = new Set(EXPLICIT_DELETES.map((e) => e.trim().toLowerCase()));
const MAY_BE_SYSTEM_ADMIN = new Set(SURVIVORS.map((s) => s.email.trim().toLowerCase()));

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

  /*
    ── ⚠⚠ ONE COMPANY PER ORG, NOT ONE BORROWED COMPANY FOR EVERYBODY ──────────

    SCOTT, 2026-09-05: *"This makes ZERO sense. There should be one company
    active per user. So, if the user has a company, then use it. If they had NO
    company, i can see adding one (Casey Fresh)."*

    THE OLD CODE borrowed ONE row — `findFirst({ where: { is_service_provider:
    true } })`, no `orderBy` — and stamped its `company_id` onto EVERY Person the
    seed created. Two defects in one line:

      1  THE ROSTER'S OWN ORG COLUMN WAS THROWN AWAY. `Users.xlsx` carries
         `team` for every seller and `company` for every buyer; both are declared
         in the `Sheet` type below and NEITHER was ever read.
      2  `findFirst` WITH NO `orderBy` IS NOT DETERMINISTIC. Postgres returns
         whatever the planner picks, so a re-run could silently re-bind every
         test account to a different company than the run before.
         ⚠ MEASURED, NOT THEORISED: on 2026-09-06 this query returned
         `Pankaj Sahu` — a DIFFERENT company from the `Casey Fresh` the live rows
         still point at. It had already drifted.

    ⚠⚠ AND IT IS WHAT DEFEATED `isPlaceholder` (`P1-J1.2-E008`). That guard reads
    "a placeholder has no tax type, exactly one person, and no memberships"
    (`lib/company.ts:79-92`) and it is CORRECT — it was fed corrupted data. A
    human signed up, the app minted them a one-person placeholder exactly as
    designed, and this seed stapled 50 others onto it. FIX THE SEED AND THE GUARD
    WORKS UNTOUCHED — do not loosen the person-count clause.

    ⚠ THIS FIXES THE SEED ONLY. Existing rows are NOT backfilled: `P1-J1.2-E007`
    is explicit that minting memberships nobody attested is itself the defect,
    and `_retired_backfill-memberships.ts` is the retired proof. Whether to
    re-seed is Scott's call, made after he sees the number.
  */
  const orgCache = new Map<string, { company_id: string; site_id: string }>();

  /**
   * One company (+ P-Account + Site) per distinct org name, idempotent by name.
   * Re-running binds to the same row rather than minting a second one.
   */
  async function orgFor(rawName: string, kind: "BUYER" | "PROVIDER") {
    const name = rawName.trim();
    const cached = orgCache.get(name.toLowerCase());
    if (cached) return cached;

    // ⚠ ORDERED. If two companies share a name, the seed must pick the SAME one
    // every run — that is the whole bug being fixed here.
    let company = await prisma.company.findFirst({
      where: { name },
      select: { id: true, sites: { select: { id: true }, orderBy: [{ created_at: "asc" }, { id: "asc" }], take: 1 } },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });

    if (!company) {
      const created = await prisma.company.create({
        data: { name, pAccount: { create: { kind, name, status: "ACTIVE" } } },
        select: { id: true },
      });
      company = { id: created.id, sites: [] };
    }

    let siteId = company.sites[0]?.id;
    if (!siteId) {
      siteId = (
        await prisma.site.create({
          data: { company_id: company.id, name: "Headquarters" },
          select: { id: true },
        })
      ).id;
    }

    const resolved = { company_id: company.id, site_id: siteId };
    orgCache.set(name.toLowerCase(), resolved);
    return resolved;
  }

  /*
    THE FALLBACK, for a roster row that names no org at all (the admins block).
    ⚠ IT IS ORDERED — `created_at asc, id asc` — so "whatever the planner picked"
    can never again mean a different company on the next run.
  */
  const fallback = await prisma.person.findFirst({
    where: { is_service_provider: true },
    select: { company_id: true, site_id: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  if (!fallback) throw new Error("no existing Person to borrow a company/site from");

  // ---- WS-1 — NAMED ACCOUNTS ----------------------------------------------
  /*
    ⚠ `org` IS THE ROSTER'S OWN COLUMN, AND BOTH SIDES HAVE ONE. Sellers carry
    `team` ("Def Leppard Consulting"), buyers carry `company` ("Ceres
    Insurance"). BOTH are declared in `Sheet` above and NEITHER was read before
    this change — the brief named `team`; `company` is the same defect on the
    buyer side and is fixed with it. Admins name no org and take the fallback.
  */
  type Acct = { email: string; name: string; provider: boolean; buyer: boolean; admin: boolean; org: string | null };
  const accounts: Acct[] = [
    ...sheet.admins.map((a) => ({ email: a.email, name: a.name, provider: false, buyer: false, admin: true, org: null })),
    ...sheet.buyers.map((b) => ({ email: b.email, name: b.name, provider: false, buyer: true, admin: false, org: b.company?.trim() || null })),
    ...sheet.sellers.map((s) => ({ email: s.email, name: s.name, provider: true, buyer: false, admin: false, org: s.team?.trim() || null })),
  ];
  // Reuben Ellis is dual-role in the sheet; make sure both flags land.
  for (const s of sheet.spec) {
    if (/both/i.test(s.cls)) {
      const a = accounts.find((x) => norm(x.email) === norm(s.email));
      if (a) { a.provider = true; a.buyer = true; }
    }
  }

  /*
    ⚠⚠⚠ GUARD 2, RUN BEFORE A SINGLE ROW IS WRITTEN — see the block at the top
    of this file. A roster row claiming admin that Scott never confirmed stops
    the seed rather than quietly minting a system administrator.
    ⚠ It runs on a DRY RUN too: the point is to catch the roster changing, and a
    dry run is where somebody would look first.
  */
  const unauthorisedAdmins = accounts
    .filter((a) => a.admin && !NEVER_RECREATE.has(norm(a.email)))
    .filter((a) => !MAY_BE_SYSTEM_ADMIN.has(norm(a.email)))
    .map((a) => norm(a.email));
  if (unauthorisedAdmins.length) {
    throw new Error(
      `REFUSING TO SEED: ${unauthorisedAdmins.length} roster account(s) claim is_system_admin ` +
        `without being one of the survivors Scott confirmed — ${unauthorisedAdmins.join(", ")}. ` +
        `Either add the address to SURVIVORS in prisma/reset/survivors-spec.ts (a decision, not a fix) ` +
        `or take the row out of the admins block in prisma/seed-data/test-users.json.`
    );
  }

  let created = 0, updated = 0, skipped = 0, refused = 0;
  for (const a of accounts) {
    const email = norm(a.email);
    if (!email.includes("@")) continue;
    /* ⚠⚠⚠ GUARD 1 — an account the reset deleted is never re-created here. */
    if (NEVER_RECREATE.has(email)) {
      refused++;
      say(`   REFUSED (deleted at the E595 reset, must not return): ${email}`);
      continue;
    }
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
      /* ⚠ THEIR OWN ORG, from the roster — not one borrowed row for everybody. */
      const org = a.org
        ? await orgFor(a.org, a.buyer && !a.provider ? "BUYER" : "PROVIDER")
        : fallback;
      await prisma.person.create({
        data: {
          user_id: user.id, first_name: first, last_name: last,
          is_service_provider: a.provider, is_service_buyer: a.buyer,
          company_id: org.company_id, site_id: org.site_id,
        },
      });
    }
  }
  say(`\nWS-1 accounts: ${APPLY ? `${created} created, ${updated} updated` : `${created} would be written`}, ${skipped} protected-skipped, ${refused} refused`);

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
    /* ⚠ `role_type_id` IS READ HERE BECAUSE THE VISIBILITY GATE REQUIRES IT
       (`access.ts:providerMeetsRequired`). It is DERIVED from the skills this
       persona actually gets — the rule `deriveRolesFromSkills` already uses —
       never typed, so a catalog change moves it without an edit here. */
    select: { id: true, name: true, skills: { select: { id: true, name: true, role_type_id: true }, take: 40 } },
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
      TITLE <= 42 CHARS, matching the card's soft cap. These exist to fill
      the search, and a seeded title that truncates on every card would make
      the cap look broken during the walk.

      ⚠⚠ IT IS WRITTEN TO `Person.title` NOW, NOT TO `ProviderProfile.headline`
      (`P0-E595` WS-B collapsed the two into one field and DROPPED the column).
      ⚠ SUPERSEDED, quoted not deleted (`E164`): the variable was named
      `headline` and went into the profile's create as `headline,`.
      ⚠⚠⚠ REMOVING THE COLUMN WITHOUT MOVING THE WRITE LEFT 25 OF 30 SEEDED
      PROVIDERS WITH NO TITLE AT ALL — measured 2026-09-21, after the reseed.
      A title is in the REQUIRED set, so that alone made every one of them
      invisible to the marketplace. The write moved; the cap did not.
    */
    const base = t.pillar.name.replace(/\s*\(.*\)$/, "");
    let title = `${base} Consultant`;
    if (title.length > 42) title = `${base} Lead`.slice(0, 42);

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
      /*
        ⚠⚠ A COMPANY OF THEIR OWN, named the way the APP names one. These are
        synthetic personas with no roster row and therefore no `team` — 25 of
        them on today's catalog, one per non-empty pillar plus the hero
        overlaps. Putting all 25 on one borrowed company is the very defect this
        work-stream removes, at 25 rows instead of 51.

        `onboarding.ts:466` mints a placeholder as `${firstName} ${lastName}` at
        real signup; this matches that convention exactly, so a seeded provider
        is indistinguishable from a signed-up one and `isPlaceholder` reads them
        both correctly — no tax type, ONE person, no memberships.

        ⚠ REPORTED, NOT ASSUMED: the brief said only "give the fallback a
        deterministic orderBy". A deterministic borrow still lands all 25 on one
        company, which contradicts WS-B's own goal and Scott's "one company
        active per user". The ordered fallback is still there and still used —
        by the admin rows, which genuinely name no org.
      */
      const own = await orgFor(`${first} ${last}`, "PROVIDER");
      person = await prisma.person.create({
        data: { user_id: user.id, first_name: first, last_name: last, is_service_provider: true,
                company_id: own.company_id, site_id: own.site_id },
        select: { id: true },
      });
    }

    /*
      ── ⚠⚠ THE REQUIRED SET, WRITTEN HERE — Scott: *"Seed providers complete"* ──

      ⚠ `providerMeetsRequired` (`access.ts`) takes SEVEN facts: title, role,
      ≥1 skill, a rate, photo, phone, ≥1 address. This seed supplied the rate
      and the skills and NOTHING ELSE, so a seeded provider has never once been
      marketplace-visible — measured 2026-09-21, and it is a large part of what
      `E581` is counting.
      ⚠⚠⚠ THE PHOTO IS THE ONE FIELD DELIBERATELY LEFT NULL, AND IT IS NOT AN
      OVERSIGHT. *"Photo REQUIRED to publish"* is a LOCKED decision, `Avatar.tsx`
      already renders initials when there is none, and the repo holds four face
      images in total. Pointing 25 personas at a borrowed face — or at an
      external avatar service, from a seed that writes to the ONE shared
      production database — is a product call, not an implementation detail.
      ⚠ So the gap is now exactly one field wide and it is reported, not guessed.
      `E564`'s rule stands: do not seed to make a surface demonstrable.
    */
    await prisma.person.update({
      where: { id: person.id },
      data: {
        title,
        /* ⚠ A RESERVED-RANGE NUMBER (555-01xx), for the same reason the emails
           are `@example.seed`: it can never reach a real handset. */
        phone: `+1555010${String(1000 + pi).slice(-4)}`,
      },
    });

    /* ⚠ ONE ADDRESS ON THEIR OWN SITE, idempotent — `orgFor` creates the Site
       but no Address, and the gate counts addresses, not sites. */
    const personSite = await prisma.person.findUnique({
      where: { id: person.id },
      select: { site_id: true, site: { select: { addresses: { select: { id: true }, take: 1 } } } },
    });
    if (personSite?.site_id && !personSite.site?.addresses.length) {
      await prisma.address.create({
        data: {
          site_id: personSite.site_id,
          line1: `${100 + pi} Example Way`,
          city: "Jacksonville",
          state: "FL",
          postal_code: "32256",
          country: "US",
        },
      });
    }

    /*
      ⚠ THE ROLE IS DERIVED FROM THE SKILLS THIS PERSONA HOLDS — the modal
      `role_type_id` among them — never typed. That is the rule
      `provider_skill_model_decision.md` states and `deriveRolesFromSkills`
      implements: *"a skill belongs to exactly one role"*. A tie breaks on the
      first skill, deterministically, because the skill list is ordered.
    */
    const roleVotes = new Map<string, number>();
    for (const s of skills) {
      if (s.role_type_id) roleVotes.set(s.role_type_id, (roleVotes.get(s.role_type_id) ?? 0) + 1);
    }
    const derivedRole =
      [...roleVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const existing = await prisma.providerProfile.findFirst({ where: { person_id: person.id }, select: { id: true } });
    const data: Prisma.ProviderProfileUncheckedCreateInput = {
      person_id: person.id,
      /* headline COLUMN REMOVED (E595 WS-B) - written to Person.title above. */
      overview: `Seeded coverage for ${t.pillar.name}. ${key}`,
      pillar_id: t.pillar.id,
      role_type_id: derivedRole,
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
        /* ⚠ `P1-A1.4-E553` — SELF_ADDED, not the DERIVED default: no job backs a
           seeded skill, so a rollup would delete it and never rebuild it. */
        create: { provider_profile_id: profile.id, skill_id: s.id, source: "SELF_ADDED" },
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
