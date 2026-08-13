import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * INSTRUCTOR CENSUS FOR LEARN — who teaches what, and do they have a face.
 *
 *   npm run learn:instructors            the census
 *   npm run learn:instructors -- --apply write the (currently empty) patch list
 *
 * ── THIS SCRIPT'S PATCH LIST IS NOW EMPTY, ON PURPOSE ────────────────────────
 *
 * It shipped with one row: put Scott's headshot on the walk-test Person that
 * taught 338 lessons. That was a stopgap — it made the right face appear by
 * writing it onto the wrong record — and `consolidate-scott-learn.ts` (WS-2)
 * replaced it with the real fix: the lessons now belong to Scott's actual
 * provider Person, so the photo flows from the record he edits.
 *
 * The list is emptied rather than the script deleted, because the census below
 * is the thing that found the bug in the first place and is worth one command
 * next time. Leaving the row in would be worse than useless: it would re-photo
 * a Person that WS-2 retired and un-clear what WS-2 cleared.
 *
 * ── WHAT THE ORIGINAL BRIEF EXPECTED, AND WHAT WAS ACTUALLY WRONG ────────────
 *
 * The brief asks for photos on Linus (sw_user2), Eddie (sw_user3) and Marelise
 * (sw_user4), on the theory that the "SW" initials come from those Person rows
 * being empty. THEY ARE NOT EMPTY — all three already carry a photo_url, and I
 * fetched all three: 200.
 *
 * The actual cause is a fourth instructor the brief does not mention. Lesson
 * expert attribution breaks down like this:
 *
 *     338 lessons   scott walls <walk.1785011538@example.com>   NO PHOTO  ←
 *      70 lessons   Linus Erley <sw_user2>                      ok
 *      56 lessons   (no expert at all)
 *      33 lessons   Marelise Steenkamp <sw_user4>               ok
 *      25 lessons   Eddie Cairnie <sw_user3>                    ok
 *
 * 338 of 522 lessons — nearly two thirds of Learn — are taught by a
 * throwaway walk-test Person named "scott walls", which is where the "SW"
 * initials come from. Scott's real headshot lives on his OTHER Person records
 * (test5@panameer.com and iamscottwalls@outlook.com), both of which teach zero
 * lessons. Nothing was going to surface it.
 *
 * ── AND THE "BETTER FIX" IS ALREADY BUILT ────────────────────────────────────
 *
 * The brief suspects a split-brain — that the avatar upload writes somewhere
 * other than the Person that Learn reads. It does not. POST /api/profile/photo
 * routes through `applyProviderSection(…, "photo", …)`, whose whole body is
 * `prisma.person.update({ data: { photo_url } })` — the same column and the
 * same row Learn reads. A provider updating their photo already updates what
 * Learn shows. There is nothing to wire.
 *
 * So this is a pure data patch, and the ONLY row that needs it is the one the
 * brief did not know about.
 *
 * IDEMPOTENT: writes only rows whose photo_url differs, and reports 0 changed
 * on a second run.
 */

/**
 * Person id → photo. Empty by design — see the note above. Add a row here only
 * for an instructor who has no account of their own to upload from; anyone with
 * a login should get their face the normal way, through their own profile.
 */
const PHOTOS: { id: string; label: string; photo: string }[] = [];

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  try {
    /*
      Report on EVERY lesson instructor, not just the ones being written. The
      point of this script is as much "who teaches what and do they have a
      face" as it is the patch itself — that is the question that took the
      investigation, and it should be one command next time.
    */
    const grouped = await prisma.lesson.groupBy({
      by: ["expert_person_id"],
      _count: { _all: true },
    });
    const ids = grouped
      .map((g) => g.expert_person_id)
      .filter((v): v is string => Boolean(v));
    const people = await prisma.person.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        photo_url: true,
        user: { select: { email: true } },
      },
    });
    const byId = new Map(people.map((p) => [p.id, p]));

    console.log("\nLESSON INSTRUCTORS");
    for (const g of grouped.sort((a, b) => b._count._all - a._count._all)) {
      const p = g.expert_person_id ? byId.get(g.expert_person_id) : null;
      const who = p
        ? `${p.first_name} ${p.last_name} <${p.user?.email ?? "no user"}>`
        : "(no expert assigned)";
      const has = p?.photo_url ? "photo" : "NO PHOTO";
      console.log(`  ${String(g._count._all).padStart(4)} lessons  ${who.padEnd(46)} ${has}`);
    }

    console.log("\nPATCH");
    let changed = 0;
    for (const row of PHOTOS) {
      const current = await prisma.person.findUnique({
        where: { id: row.id },
        select: { photo_url: true },
      });
      if (!current) {
        console.log(`  MISSING  ${row.label} — no such Person, skipped`);
        continue;
      }
      if (current.photo_url === row.photo) {
        console.log(`  ok       ${row.label} already set`);
        continue;
      }
      if (!apply) {
        console.log(`  would    ${row.label} → ${row.photo}`);
        continue;
      }
      await prisma.person.update({
        where: { id: row.id },
        data: { photo_url: row.photo },
      });
      console.log(`  set      ${row.label} → ${row.photo}`);
      changed++;
    }

    console.log(
      apply
        ? `\nAPPLIED — ${changed} row(s) updated.\n`
        : "\nREPORT ONLY — nothing written. Re-run with --apply.\n"
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
