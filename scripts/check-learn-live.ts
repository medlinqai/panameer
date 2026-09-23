/**
 * `check:learn-live` — the Learn assertions only a live database can make
 * (`P2-A4-E606` WS-C). `npm run check:learn-live`.
 *
 * ── ⚠⚠⚠ SCOTT'S 522 LESSONS ──────────────────────────────────────────────
 *
 * ⚠ The catalogue is **23 paths and 522 lessons written by hand.** `check:learn`
 * forbids a write PATH from existing on the learner surface; this asserts the
 * ROWS are still there. ⚠⚠ THE TWO ARE DIFFERENT CLAIMS and both are needed: a
 * row count proves this run wrote nothing, a shape check proves no future run
 * can.
 *
 * ⚠⚠⚠ IT SEEDS NOTHING INTO `Lesson` OR `LearningPath`, EVER. The brief forbids
 * it outright, and a gate that seeded a lesson to prove lessons are safe would
 * be the joke version of this file.
 */
import { prisma } from "@/lib/prisma";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
};

/** ⚠ Derived from the tree, never a hand-written list (`E587`). */
function routes(dir = "src/app", out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) routes(full, out);
    else if (e === "page.tsx") out.push(full.replace(/^src\/app/, "").replace(/\/page\.tsx$/, "") || "/");
  }
  return out;
}

(async () => {
  /* ── the catalogue, counted directly ──────────────────────────────────── */
  const [paths, lessons, courses, sections] = await Promise.all([
    prisma.learningPath.count(),
    prisma.lesson.count(),
    prisma.course.count(),
    prisma.section.count(),
  ]);
  check("1 — ⚠ the catalogue is non-empty, so these assertions mean something (E586)",
    paths > 0 && lessons > 0, `${paths} paths · ${lessons} lessons`);
  /*
    ⚠⚠⚠ THE NUMBERS ARE NAMED HERE ON PURPOSE, AND THIS IS THE ONE PLACE A
    CATALOGUE LITERAL IS CORRECT. Everywhere else a literal is a stale copy of a
    query; here the literal IS the assertion — "Scott wrote 23 and 522, and they
    are still 23 and 522". ⚠ If the catalogue legitimately grows, this line is
    edited deliberately, by a person, in a commit that says why.
  */
  check("1 — ⚠⚠⚠ LearningPath rows are unchanged", paths === 23, `${paths} (expected 23)`);
  check("1 — ⚠⚠⚠ Lesson rows are unchanged", lessons === 522, `${lessons} (expected 522)`);
  check("1 — ⚠⚠ Course rows are unchanged", courses === 54, `${courses} (expected 54)`);
  check("1 — ⚠⚠ Section rows are unchanged", sections === 170, `${sections} (expected 170)`);

  /* ── the computed catalogue counts, against a direct count ────────────── */
  const { getCatalogCounts } = await import("@/lib/learn-catalog-counts");
  const counts = await getCatalogCounts();
  const val = (label: string) => Number(counts.find((c) => c.label === label)?.value ?? -1);
  const startable = await prisma.learningPath.count({
    where: {
      status: "PUBLISHED",
      courses: { some: { sections: { some: { lessons: { some: { vimeo_ref: { not: null } } } } } } },
    },
  });
  check("2 — ⚠ the counts module returned three labelled figures (E586)",
    counts.length === 3 && counts.every((c) => c.label && c.value), counts.map((c) => `${c.value} ${c.label}`).join(" · "));
  /*
    ⚠⚠ A SECOND, INDEPENDENT QUERY — a looser one, on `vimeo_ref` alone. The
    module also requires a playable production status, so its answer must be
    **at most** this one. ⚠⚠⚠ ASSERTING EQUALITY WOULD BE ASSERTING THE MODULE
    AGAINST ITSELF; a bound catches the case where the filter silently stops
    filtering.
  */
  check("2 — ⚠⚠ startable paths never exceed paths with any video",
    val("Paths You Can Start") <= startable && val("Paths You Can Start") > 0,
    `${val("Paths You Can Start")} startable ≤ ${startable} with video`);
  check("2 — ⚠⚠⚠ the computed count is SMALLER than the raw catalogue, as its label claims",
    val("Paths You Can Start") < paths && val("Lessons You Can Watch") < lessons,
    `${val("Paths You Can Start")} of ${paths} paths · ${val("Lessons You Can Watch")} of ${lessons} lessons`);

  /* ── the route set, derived on both sides ─────────────────────────────── */
  const learnRoutes = routes().filter((r) => r.startsWith("/learn")).sort();
  /*
    ⚠⚠ THE EXPECTED SET IS WRITTEN OUT, and that is deliberate: this assertion
    exists to catch a route DISAPPEARING, so it cannot derive both sides from
    the same tree — that would compare the tree to itself and always pass.
    ⚠ Adding a route is a one-line edit here, in the commit that adds it.
  */
  const EXPECTED = [
    "/learn",
    "/learn/[slug]",
    "/learn/[slug]/[lessonId]",
    "/learn/[slug]/course/[courseSlug]",
    "/learn/[slug]/test",
    "/learn/courses",
    "/learn/my-courses",
    "/learn/paths",
  ];
  check("3 — ⚠ the route sweep found Learn routes (E586)", learnRoutes.length > 0, `${learnRoutes.length}`);
  const missing = EXPECTED.filter((r) => !learnRoutes.includes(r));
  const added = learnRoutes.filter((r) => !EXPECTED.includes(r));
  check("3 — ⚠⚠⚠ every Learn route that existed still exists",
    missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : `${learnRoutes.length} routes intact`);
  check("3 — ⚠ no Learn route appeared unannounced",
    added.length === 0, added.length ? `NEW: ${added.join(", ")}` : "none");

  if (failures.length) {
    console.error(`\ncheck:learn-live — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:learn-live — ${pass}/${pass} passed`);
  process.exit(0);
})();
