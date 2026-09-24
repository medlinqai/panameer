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
import { readFileSync, readdirSync, statSync } from "node:fs";
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


  /* ── ⚠⚠⚠ ONE DEFINITION OF "A PATH A MEMBER CAN OPEN" (`E607`) ────────── */
  /**
   * ⚠ SCOTT: *"Assert that no path-rendering route admits a path that discovery
   * hides, derived on both sides rather than listed."*
   *
   * ⚠⚠ BOTH SIDES ARE COMPUTED FROM THE DATABASE, NOT NAMED. `hidden` is every
   * PUBLISHED path discovery drops; the assertion then asks each path-rendering
   * entry point what it returns for that slug. ⚠⚠⚠ A LIST WOULD HAVE TO BE
   * EDITED THE DAY A VIDEO IS UPLOADED — and the whole point of the filter is
   * that a path returns on its own when one is.
   */
  {
    const { getLearnPath } = await import("@/lib/learn-home");
    const { getAppPath } = await import("@/lib/learn-path-app");
    const { pathIsOpenTo } = await import("@/lib/learn");

    const all = await prisma.learningPath.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        courses: { select: { sections: { select: { lessons: {
          select: { vimeo_ref: true, production_status: true } } } } } },
      },
    });
    const { pathHasPlayableLessons } = await import("@/lib/learn");
    const hidden = all.filter((p) => !pathIsOpenTo(pathHasPlayableLessons(p), false));
    check(
      "4 — ⚠ discovery hides at least one path, so this assertion has inputs (E586)",
      hidden.length > 0 && hidden.length < all.length,
      `${hidden.length} hidden of ${all.length} published`
    );

    /* ⚠⚠ A VISITOR — `null` userId, so the enrolment clause cannot rescue it. */
    const leaks: string[] = [];
    for (const p of hidden) {
      const view = await getLearnPath(p.slug, null);
      if (view && view.ready) leaks.push(`getLearnPath(${p.slug}).ready === true`);
      /* ⚠ `P2-A4-E611` — `getAppPath` takes a `Viewer` now, because the path
         view carries the forum teaser and that asks `canAccessPathForum`.
         ⚠⚠ A STRANGER WITH A REAL-LOOKING ID IS STILL THE POINT: the id owns
         nothing, so the enrolment clause cannot rescue the path.
         ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   const app = await getAppPath(p.slug, "00000000-0000-0000-0000-000000000000"); */
      const app = await getAppPath(p.slug, {
        userId: "00000000-0000-0000-0000-000000000000",
      } as never);
      if (app && app.ready) leaks.push(`getAppPath(${p.slug}).ready === true`);
    }
    check(
      "4 — ⚠⚠⚠ no path-rendering route reports a hidden path as ready",
      leaks.length === 0,
      leaks.length ? leaks.slice(0, 3).join(" · ") : `${hidden.length} hidden paths, all reported not-ready by both routes`
    );

    /* ⚠ AND A PATH DISCOVERY SHOWS MUST REPORT READY — or the assertion above
       passes by reporting EVERYTHING not-ready, which is `E586` inverted. */
    const shown = all.filter((p) => pathIsOpenTo(pathHasPlayableLessons(p), false));
    const wrong: string[] = [];
    for (const p of shown.slice(0, 5)) {
      const view = await getLearnPath(p.slug, null);
      if (view && !view.ready) wrong.push(p.slug);
    }
    check(
      "4 — ⚠⚠ …and a path discovery SHOWS is reported ready",
      wrong.length === 0 && shown.length > 0,
      wrong.length ? `reported not-ready: ${wrong.join(", ")}` : `${Math.min(shown.length, 5)} of ${shown.length} startable paths checked`
    );

    /*
      ── ⚠⚠⚠ THE WRITE ROUTES, NOT ONLY THE RENDERING ONES (`E608`) ──────────

      ⚠ A page that says *"no videos yet"* while the API happily enrols you in
      the same path is still a dead end — the refusal has to be where the WRITE
      is, not only where the reader is.
      ⚠⚠ ASSERTED BY SHAPE (`E587`): every route under `src/app/api/learn` that
      resolves a `learningPath` must ask `pathIsOpenTo`. Nothing here names
      `enroll` or `test` — a third write route added tomorrow is caught tomorrow,
      with no edit.
      ⚠ `progress` IS EXPECTED TO BE ABSENT FROM THE POPULATION and that is not
      an exemption: it resolves a LESSON, never a path, so it never matches.
    */
    const apiDir = join(process.cwd(), "src", "app", "api", "learn");
    const routes: string[] = [];
    (function walkApi(dir: string) {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) walkApi(full);
        else if (e === "route.ts") routes.push(full);
      }
    })(apiDir);
    const stripTs = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
    const pathRoutes = routes.filter((f) =>
      /prisma\.learningPath\.(findFirst|findUnique)/.test(stripTs(readFileSync(f, "utf8")))
    );
    check(
      "4 — ⚠ the sweep found Learn write routes that resolve a path (E586)",
      pathRoutes.length > 0,
      pathRoutes.map((f) => f.replace(process.cwd() + "/", "")).join(", ")
    );
    /*
      ⚠⚠ THE CALL MUST SIT IN A CONTROL-FLOW POSITION, not merely appear. A
      bare `pathIsOpenTo(…)` whose result nothing reads would satisfy a
      contains-check and gate nothing — the "present but unused" shape.
      ⚠⚠⚠ AND THE LIMIT, STATED RATHER THAN GLOSSED: **this reads source. It
      proves the refusal is WIRED, not that it FIRES.** Proving it fires needs
      an HTTP request with a session, which is `check:stats-live`'s shape and
      not this gate's. The `4 — no path-rendering route reports a hidden path
      as ready` assertion above is the behavioural half, and it calls the real
      functions.
    */
    /*
      ⚠⚠ TWO WAYS TO BE GATED, AND THE SECOND WAS ADDED AT `P2-A4-E610`:
      calling `pathIsOpenTo` in control flow, **or** calling
      `learnEnrolmentRefusal` in control flow — the extracted rule that CONTAINS
      `pathIsOpenTo` and the identity bar with it.
      ⚠⚠⚠ THIS IS `check:rollup`'S CASE, NOT `check:cert-skills`' — the RULING
      changed, the code did not drift. `/api/learn/enroll` stopped spelling the
      condition out because `/api/learn/progress` wrote the same table with NO
      condition at all, and the fix was one rule called twice.
      ⚠ THE CHAIN IS ONLY HONEST BECAUSE ITS OTHER HALF IS GATED:
      `check:learn-enrol` assertion 1 fails if `learnEnrolmentRefusal` ever
      stops containing `pathIsOpenTo(pathHasPlayableLessons(path), false)`. ⚠⚠ A
      delegation accepted here without that assertion there would be a hole
      shaped exactly like the one this whole id closed.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   const ungated = pathRoutes.filter(
      //     (f) => !/(if\s*\(\s*!?\s*pathIsOpenTo\(|return\s+!?pathIsOpenTo\()/.test(
      //       stripTs(readFileSync(f, "utf8"))
      //     )
      //   );
    */
    const GATED =
      /(if\s*\(\s*!?\s*pathIsOpenTo\(|return\s+!?pathIsOpenTo\(|const\s+\w+\s*=\s*await\s+learnEnrolmentRefusal\()/;
    const ungated = pathRoutes.filter((f) => !GATED.test(stripTs(readFileSync(f, "utf8"))));
    check(
      "4 — ⚠⚠⚠ no Learn write route admits a path discovery hides",
      ungated.length === 0,
      ungated.length
        ? `UNGATED: ${ungated.map((f) => f.replace(process.cwd() + "/", "")).join(", ")}`
        : `${pathRoutes.length} path-resolving write routes, all gated`
    );
  }

  if (failures.length) {
    console.error(`\ncheck:learn-live — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:learn-live — ${pass}/${pass} passed`);
  process.exit(0);
})();
