import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Reconcile each Learning Path's DECLARED lead with who actually teaches it
 * (brief_learn_experience WS6, corrected).
 *
 *   npm run seed:learn-experts
 *
 * Teaching is recorded PER LESSON — 466 of the 522 lessons carry an
 * `expert_person_id` — and the app now derives a path's and a course's
 * instructors from those. `LearningPath.expert_person_id` has one remaining
 * job: a fallback lead for a path whose lessons name nobody at all.
 *
 * The first version of this script got that wrong. It assigned one instructor
 * to all 23 paths by subject area, which produced claims the lesson data
 * contradicts — Advanced Procurement was labelled Marelise's while its 105
 * lessons are taught by Scott (85) and Linus (18). Those declarations are inert
 * now that derivation reads lessons, but they are still visible in the admin
 * console, and a stated fact that disagrees with the data is a trap for whoever
 * reads it next.
 *
 * So this script:
 *   1. CLEARS a declared lead that no lesson supports — the contradiction.
 *   2. LEAVES a declared lead that IS one of the path's real teachers.
 *   3. SETS a fallback only where no lesson names anyone, so the path still has
 *      a face to show.
 *
 * Idempotent; safe to re-run after a catalog import.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const EDDIE = "sw_user3@straterp.com";
const LINUS = "sw_user2@straterp.com";
const MARELISE = "sw_user4@straterp.com";

/**
 * Fallback leads, by subject, for paths whose lessons name nobody. Read off the
 * instructors' own live profiles — Eddie is the Finance expert, Linus Supply
 * Chain, Marelise P2P/HCM — so a fallback is never someone who couldn't
 * actually deliver the material.
 */
const FALLBACK: Record<string, string> = {
  "Cost Accounting": EDDIE,
  "Talent Mgmt": MARELISE,
  Beginners: LINUS,
  Implementers: LINUS,
  ERP: LINUS,
};

async function main() {
  const people = await prisma.person.findMany({
    where: { user: { email: { in: [EDDIE, LINUS, MARELISE] } } },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      photo_url: true,
      user: { select: { email: true } },
    },
  });
  const byEmail = new Map(people.map((p) => [p.user!.email, p]));

  const paths = await prisma.learningPath.findMany({
    select: {
      id: true,
      title: true,
      expert_person_id: true,
      courses: {
        select: {
          sections: { select: { lessons: { select: { expert_person_id: true } } } },
        },
      },
    },
    orderBy: { title: "asc" },
  });

  let cleared = 0;
  let kept = 0;
  let set = 0;
  const noFace: string[] = [];

  for (const lp of paths) {
    const lessonExperts = new Set(
      lp.courses
        .flatMap((c) => c.sections.flatMap((s) => s.lessons))
        .map((l) => l.expert_person_id)
        .filter((x): x is string => Boolean(x))
    );

    if (lessonExperts.size > 0) {
      if (lp.expert_person_id && !lessonExperts.has(lp.expert_person_id)) {
        await prisma.learningPath.update({
          where: { id: lp.id },
          data: { expert_person_id: null },
        });
        console.log(
          `  cleared  ${lp.title.padEnd(46)} (declared lead teaches none of its ${lessonExperts.size > 1 ? "lessons" : "lessons"})`
        );
        cleared++;
      } else if (lp.expert_person_id) {
        kept++;
      }
      continue;
    }

    // No lesson names anybody — this is the one case the declared lead is for.
    const email = FALLBACK[lp.title];
    const person = email ? byEmail.get(email) : null;
    if (!person) {
      noFace.push(lp.title);
      continue;
    }
    if (lp.expert_person_id === person.id) {
      kept++;
      continue;
    }
    await prisma.learningPath.update({
      where: { id: lp.id },
      data: { expert_person_id: person.id },
    });
    console.log(
      `  fallback ${lp.title.padEnd(46)} → ${person.first_name} ${person.last_name}`
    );
    set++;
  }

  console.log(`\ncleared contradictions: ${cleared}  kept: ${kept}  fallbacks set: ${set}`);
  if (noFace.length > 0) {
    console.log(`no lesson experts and no fallback (will show no face): ${noFace.join(", ")}`);
  }

  /*
    The point of WS6 is the face, so an instructor without a photo is a silent
    regression to initials. Worth saying out loud rather than discovering it in
    a screenshot.
  */
  const teaching = await prisma.person.findMany({
    where: { learnLessons: { some: {} }, photo_url: null },
    select: {
      first_name: true,
      last_name: true,
      _count: { select: { learnLessons: true } },
    },
  });
  for (const t of teaching) {
    console.log(
      `  ! ${t.first_name} ${t.last_name} teaches ${t._count.learnLessons} lessons and has NO PHOTO`
    );
  }

  await prisma.$disconnect();
}

void main();
