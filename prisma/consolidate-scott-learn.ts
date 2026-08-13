import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * ONE SCOTT RECORD (brief_learn_owner_profile_fixes_08_10 WS-2).
 *
 *   npm run learn:owner                     report only — nothing is written
 *   npm run learn:owner -- --apply          re-attribute + retire
 *   npm run learn:owner -- --apply --disable-login   also block the retirees' sign-in
 *
 * ── WHAT IS ACTUALLY WRONG ───────────────────────────────────────────────────
 *
 * Learn content is attributed to a Person that Scott does not sign in as. A
 * throwaway walk-test Person teaches 338 of 522 lessons; his real provider
 * account teaches none. So his headshot could never appear on his own courses,
 * and no amount of re-uploading it would change that — the photo was landing on
 * a record nothing rendered.
 *
 * ── RESOLVED BY EMAIL, NOT BY ID ─────────────────────────────────────────────
 *
 * Every Person below is looked up by the email on its User, and the script
 * aborts if any of them is missing or ambiguous. Ids are what let the last pass
 * patch a photo onto the wrong Scott: nine Person rows in this database are
 * named some casing of "scott walls", and an id in a script is unreadable — you
 * cannot tell by looking whether it is the right one. An email you can.
 *
 * ── WHAT "RETIRE" CAN AND CANNOT MEAN HERE ───────────────────────────────────
 *
 * There is no ARCHIVED state to move these rows to. `PersonStatus` is
 * ACTIVE|INACTIVE and NOTHING IN src/ READS IT — setting INACTIVE is a marker
 * for humans, not an enforced state, and saying otherwise would be inventing a
 * guarantee. What the retirement actually enforces is:
 *
 *   · `ProviderProfile.paused_at` — the real, enforced marketplace-invisibility
 *     lever (`isMarketplaceVisible` / `marketplaceVisibleWhere` in access.ts).
 *     Neither retiree is visible today, but both are ONE profile edit away from
 *     it, and a second Scott in /explore is the failure this is meant to prevent.
 *   · `Person.photo_url` cleared — a retired persona should not carry a face.
 *     The previous URL is printed so it is recoverable.
 *
 * The one switch that genuinely retires an account is `User.is_active = false`
 * (auth.ts refuses sign-in on it). It is behind `--disable-login` rather than
 * automatic, because `test5@panameer.com` is headlined "Scott's Third Pass at
 * the Parser" and is plausibly still in use for résumé-parser testing. Locking
 * Scott out of a test account mid-investigation is not a cleanup.
 *
 * ── WHAT IT DOES NOT TOUCH ───────────────────────────────────────────────────
 *
 * · The Panameer Admin. (Worth knowing: `scott.walls@straterp.com` from the
 *   brief's account map has NO User row in this database at all. The admin here
 *   is `admin@panameer.com`. The guard below is kept anyway — it costs nothing
 *   and the map may describe an environment this script gets run against later.)
 * · The six OTHER duplicate Scott personas. The brief names two; the database
 *   holds nine. The rest are listed in the report for Scott's call rather than
 *   swept up, because "delete the records that look like me" is not a decision
 *   a script should make on its own.
 * · The 56 expert-less lessons. Listed, never auto-assigned — the brief is
 *   explicit, and 38 of them are one path (Cost Accounting) that may not be his.
 *
 * IDEMPOTENT: re-running re-attributes 0 rows and reports the same state.
 */

const CANONICAL_EMAIL = "iamscottwalls@outlook.com";
const RETIRE_EMAILS = ["walk.1785011538@example.com", "test5@panameer.com"];
/** Never writable by this script, whatever else changes. */
const PROTECTED_EMAILS = ["scott.walls@straterp.com", "admin@panameer.com"];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type Row = {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  status: string;
  profileId: string | null;
  pausedAt: Date | null;
  lessons: number;
  paths: number;
};

async function load(email: string): Promise<Row> {
  const people = await prisma.person.findMany({
    where: { user: { email } },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      photo_url: true,
      status: true,
      providerProfile: { select: { id: true, paused_at: true } },
      _count: { select: { learnLessons: true, learnPaths: true } },
    },
  });
  if (people.length !== 1) {
    throw new Error(
      `Expected exactly one Person for ${email}, found ${people.length}. Refusing to guess.`
    );
  }
  const p = people[0];
  return {
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    email,
    photo: p.photo_url,
    status: p.status,
    profileId: p.providerProfile?.id ?? null,
    pausedAt: p.providerProfile?.paused_at ?? null,
    lessons: p._count.learnLessons,
    paths: p._count.learnPaths,
  };
}

function line(r: Row) {
  return `  ${r.name.padEnd(14)} ${r.email.padEnd(32)} lessons=${String(r.lessons).padStart(3)} paths=${r.paths} photo=${r.photo ? "Y" : "n"} status=${r.status}${r.pausedAt ? " PAUSED" : ""}`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const disableLogin = process.argv.includes("--disable-login");

  try {
    const canonical = await load(CANONICAL_EMAIL);
    const retirees = [];
    for (const e of RETIRE_EMAILS) retirees.push(await load(e));

    if (PROTECTED_EMAILS.includes(CANONICAL_EMAIL) || retirees.some((r) => PROTECTED_EMAILS.includes(r.email))) {
      throw new Error("A protected account appeared in the work list. Aborting.");
    }

    console.log("\nBEFORE");
    console.log(line(canonical), "   <- canonical");
    for (const r of retirees) console.log(line(r), "   <- retire");

    if (apply) {
      for (const r of retirees) {
        const lessons = await prisma.lesson.updateMany({
          where: { expert_person_id: r.id },
          data: { expert_person_id: canonical.id },
        });
        const paths = await prisma.learningPath.updateMany({
          where: { expert_person_id: r.id },
          data: { expert_person_id: canonical.id },
        });
        console.log(`\n  ${r.email}: moved ${lessons.count} lessons, ${paths.count} paths -> ${CANONICAL_EMAIL}`);

        if (r.photo) console.log(`    clearing photo (recoverable): ${r.photo}`);
        await prisma.person.update({
          where: { id: r.id },
          data: { status: "INACTIVE", photo_url: null },
        });
        if (r.profileId && !r.pausedAt) {
          await prisma.providerProfile.update({
            where: { id: r.profileId },
            data: { paused_at: new Date() },
          });
          console.log("    provider profile paused (marketplace-invisible)");
        }
        if (disableLogin) {
          await prisma.user.updateMany({ where: { email: r.email }, data: { is_active: false } });
          console.log("    sign-in disabled (User.is_active = false)");
        }
      }

      console.log("\nAFTER");
      console.log(line(await load(CANONICAL_EMAIL)), "   <- canonical");
      for (const e of RETIRE_EMAILS) console.log(line(await load(e)), "   <- retired");
    } else {
      console.log("\nREPORT ONLY — nothing written. Re-run with --apply.");
    }

    // ── The other Scotts. Informational; this script never touches them. ──
    const others = await prisma.person.findMany({
      where: {
        first_name: { contains: "scott", mode: "insensitive" },
        last_name: { contains: "wall", mode: "insensitive" },
        id: { notIn: [canonical.id, ...retirees.map((r) => r.id)] },
      },
      select: {
        id: true, first_name: true, last_name: true, photo_url: true,
        user: { select: { email: true } },
        providerProfile: { select: { completeness: true, status: true } },
        _count: { select: { learnLessons: true } },
      },
    });
    console.log(`\nOTHER "Scott" PERSONAS STILL PRESENT (${others.length}) — not touched, for Scott's call`);
    for (const o of others) {
      console.log(
        `  ${(o.user?.email ?? "no user").padEnd(32)} lessons=${o._count.learnLessons} photo=${o.photo_url ? "Y" : "n"} completeness=${o.providerProfile?.completeness ?? "-"} id=${o.id}`
      );
    }

    // ── The 56. Surfaced, never assigned. ──
    const orphans = await prisma.lesson.findMany({
      where: { expert_person_id: null },
      orderBy: [{ section: { course: { learningPath: { title: "asc" } } } }, { sort_order: "asc" }],
      select: {
        title: true,
        section: {
          select: { course: { select: { title: true, learningPath: { select: { title: true } } } } },
        },
      },
    });
    console.log(`\nLESSONS WITH NO EXPERT (${orphans.length}) — for Scott to assign, NOT auto-assigned`);
    let lastPath = "";
    for (const l of orphans) {
      const p = l.section.course.learningPath.title;
      if (p !== lastPath) {
        console.log(`\n  ${p}`);
        lastPath = p;
      }
      console.log(`    ${l.section.course.title} > ${l.title}`);
    }
    console.log("");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
