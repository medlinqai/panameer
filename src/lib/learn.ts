/* ⚠ `prisma` WENT WITH THE THREE DEAD EXPORTS (`E608`) — they were the only
   queries in this file. ⚠⚠ WHAT REMAINS IS PURE: `isPlayable`,
   `pathHasPlayableLessons` and `pathIsOpenTo` are predicates over rows a
   CALLER already fetched, which is why they can be shared by the data layer,
   the page and a gate without any of them importing a client.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { prisma } from "@/lib/prisma"; */

/**
 * Public Learn queries (brief_learn_v1 WS2).
 *
 * Everything here is READ-ONLY and PUBLIC — no viewer, no ownership check,
 * because the curriculum is the front door. Enrollment and progress (WS4) are the
 * parts that need a session; browsing and watching do not.
 */

/**
 * THE PLAYBACK GATE, in one place.
 *
 * A lesson plays only when BOTH are true: the production ladder has reached
 * URL_ADDED_TO_LESSON, and a `vimeo_ref` is actually stored. Both halves are
 * required because the catalog disagrees with itself — 296 lessons carry the
 * status while the workbook's Vimeo column is empty, so the status records that
 * someone BELIEVES a URL was added and the column records whether one is there.
 * Trusting the status alone would render 296 empty players.
 *
 * The curriculum is NOT hidden behind this. An unplayable lesson still appears
 * in the outline with its title and run time — the brief is explicit that we
 * gate playback, not visibility. Someone deciding whether this path is worth
 * their time needs to see what it covers.
 */
/**
 * ⚠⚠ The bucket an unfiled path falls into (`P2-A4-E611`, Q5).
 *
 * ⚠⚠⚠ IT LIVES IN THIS FILE BECAUSE THIS FILE IS PURE. It was first written in
 * `learn-home.ts`, which imports `prisma` — and `LearnHome.tsx` is a CLIENT
 * component, so a VALUE import from there pulled `pg` into the browser bundle
 * and the build failed on `Can't resolve 'dns'`. ⚠ A type-only import would
 * have been erased; a value one is not.
 * ⚠ One constant, shared by the chip builder (server) and the filter (client),
 * because two spellings of the word would make the chip select nothing.
 */
export const OTHER_GROUP = "Other";

export const PLAYABLE_STATUSES = [
  "URL_ADDED_TO_LESSON",
  "BLOG_CREATED",
  "BLOG_RELEASED",
] as const;

export function isPlayable(lesson: {
  vimeo_ref: string | null;
  production_status: string;
}): boolean {
  return (
    Boolean(lesson.vimeo_ref?.trim()) &&
    (PLAYABLE_STATUSES as readonly string[]).includes(lesson.production_status)
  );
}

/**
 * ── ⚠⚠ THE AMBER CASE: THE ROW CLAIMS A URL AND HAS NOT GOT ONE ──────────
 *
 * ⚠ 59 lessons on 2026-09-23 — a `production_status` that says the video was
 * added while `vimeo_ref` is empty. ⚠⚠ It is NOT `!isPlayable`: a lesson still
 * in concept is honestly unplayable, and this one is *making a false claim*.
 * The two must never be counted together.
 *
 * ⚠⚠⚠ EXTRACTED AT `P2-A4-E610` BECAUSE IT WAS WRITTEN OUT IN FOUR PLACES —
 * `StructureEditor.tsx`, `LessonEditor.tsx`, `learn-admin.ts` and
 * `app/admin/learn/page.tsx` — two as predicates and two as Prisma `where`
 * clauses. ⚠ A hand-rolled copy agrees until the rule changes, and the SQL half
 * cannot call a TypeScript predicate, which is why `PLAYABLE_STATUSES` is
 * exported for the `where` clauses to spread.
 */
export function urlMissing(lesson: {
  vimeo_ref: string | null;
  production_status: string;
}): boolean {
  return (
    (PLAYABLE_STATUSES as readonly string[]).includes(lesson.production_status) &&
    !lesson.vimeo_ref?.trim()
  );
}

/**
 * ── ⚠⚠⚠ WHAT A LESSON'S STATE HONESTLY IS (`P2-A4-E611` · production signal)
 *
 * ⚠⚠ SCOTT, 2026-09-23: **no new column.** The existing enum already carries
 * three states, and `Ready` is never stored — it is `isPlayable`, computed.
 *
 *   planned   `IN_CONCEPT` · `NEEDS_REFRESH` · `DECK_READY`        — 137
 *   recorded  `RAW_SHOT` · `PRODUCED` · `LOADED_TO_STREAMING`      —  21
 *   ready     `isPlayable` — the status claims a URL AND one is stored
 *
 * ⚠⚠⚠ AND A FOURTH THING THAT IS NOT A STATE, IT IS A DEFECT: **59 lessons
 * claim `URL_ADDED_TO_LESSON` with an empty `vimeo_ref`.** Their real state is
 * UNKNOWN — the stored status is the thing that lied. ⚠ Scott rules on those
 * 59, grouped by path; until he does, this returns `unpublished`, which is the
 * weakest TRUE statement available: it is not published. **It makes no claim
 * about whether anything was shot**, because nothing in the data supports one.
 *
 * ⚠⚠ `duration_source = "xls"` IS NOT EVIDENCE A LESSON WAS SHOT. Scott typed
 * an estimate for every planned lesson — *"always 5 min, plus or minus 1
 * minute."* **Do not classify from it.**
 *
 * ⚠⚠⚠ NONE OF THESE LABELS PROMISES A DATE, AN ETA OR A NOTIFICATION. The
 * schema holds no publish date and nothing emails anybody when a video lands —
 * so *"it'll play here the moment it lands"* and *"written and scheduled"*,
 * which this replaces, were both promises with no writer.
 */
export const RECORDED_STATUSES = [
  "RAW_SHOT",
  "PRODUCED",
  "LOADED_TO_STREAMING",
] as const;

export type LessonState = "ready" | "recorded" | "unpublished" | "planned";

export function lessonState(lesson: {
  vimeo_ref: string | null;
  production_status: string;
}): LessonState {
  if (isPlayable(lesson)) return "ready";
  if ((RECORDED_STATUSES as readonly string[]).includes(lesson.production_status))
    return "recorded";
  /* ⚠ The 59. The status claims a URL and there is none — say only what is true. */
  if (urlMissing(lesson)) return "unpublished";
  return "planned";
}

/** ⚠ ONE STRING PER STATE, so no surface invents its own wording. */
export const LESSON_STATE_LABEL: Record<LessonState, string> = {
  ready: "Ready",
  recorded: "Recorded — not published yet",
  unpublished: "Not published yet",
  planned: "Planned",
};

/**
 * A path a learner can actually START — at least one playable lesson anywhere in
 * it (`P1-J3-E362`).
 *
 * **SCOTT, 2026-09-02:** *"If there is no video...no sense adding the
 * course/lesson."*
 *
 * ⚠⚠ DERIVED FROM `isPlayable` ABOVE, NEVER RE-IMPLEMENTED. There is exactly one
 * definition of playability on the server and this composes it. Measured
 * 2026-09-02: 305 of 522 lessons are playable and ELEVEN of 23 published paths
 * have zero.
 *
 * ── ⚠⚠ HIDE, NEVER DELETE, AND THE VISIBILITY IS PER AUDIENCE ────────────────
 *
 * Nothing is removed from the database. A path with no video today is a path
 * with video next month, and the day one is uploaded it comes back on its own —
 * no migration, no re-import, no code change, because this is a query-time
 * predicate and not a stored flag.
 *
 * ⚠ AND IT IS APPLIED ONLY ON THE LEARNER'S DISCOVERY SURFACES:
 *   HIDDEN   the `/learn` dashboard, its catalog grid, coverage, totals, and
 *            the suggested first path
 *   VISIBLE  `getPathsTaughtByProfile` (the instructor's own profile) and
 *            everything under `/admin`
 *
 * ⚠⚠ THE INSTRUCTOR EXCEPTION IS NOT OPTIONAL. Marelise Steenkamp teaches
 * lessons across five paths and THREE of them have zero playable lessons
 * (Payroll Mgmt, Benefits Admin, Talent Mgmt). A blunt global filter would mean
 * she opens her own profile and finds them gone — which reads as data loss, not
 * as a design rule. For a teacher an un-shot lesson is a WORK QUEUE.
 *
 * ⚠ AND AN ALREADY-ENROLLED LEARNER KEEPS THEIR PATH. The filter is on
 * DISCOVERY, not on "what I'm already in". Measured: 0 enrollments are affected
 * today, but the rule holds regardless.
 */
export function hasPlayableLessons(
  lessons: { vimeo_ref: string | null; production_status: string }[]
): boolean {
  return lessons.some(isPlayable);
}

/**
 * The same question about a path shaped as the nested tree the reads return.
 * ⚠ A CONVENIENCE OVER `hasPlayableLessons`, not a second rule.
 */
/**
 * PERSONAL PROGRESS, OVER WHAT CAN ACTUALLY BE WATCHED (`P1-J3-E364` WS-5).
 *
 * **SCOTT, 2026-09-02:** *"why do we have a 94%? that is silly. sounds like we
 * are counting a course that will never be there...just don't count it then."*
 *
 * ⚠⚠ HE IS DESCRIBING A REAL ARITHMETIC BUG. Inventory Management has 50 lessons
 * and 47 playable, so `completed / lessons.length` capped a learner who had
 * watched EVERYTHING WATCHABLE at 94%. They could never finish.
 *
 * ⚠ SAME RULE `E362` APPLIED TO CATALOG TOTALS, NOW APPLIED TO PERSONAL
 * PROGRESS. Before this the two disagreed — the catalog counted 305 lessons and
 * progress counted 522 — which is the whole defect.
 *
 * ── ⚠ `completed` IS ALSO COUNTED OVER PLAYABLE ONLY ─────────────────────────
 *
 * Not just the denominator. A lesson watched before its video was pulled still
 * has a `LessonProgress` row, and counting it in the numerator while excluding it
 * from the denominator would produce a percentage OVER 100. Both sides read the
 * same set, so the ratio is always 0..100 by construction.
 *
 * ── ⚠ ONE DEFINITION, SIX CALLERS ───────────────────────────────────────────
 *
 * Six files computed this separately. They now all call this, and
 * `check:playable` fails the build if any file divides by a raw `lessons.length`
 * again.
 *
 * ⚠ A CONSEQUENCE, INTENDED AND NOT PREVENTED: shooting a missing video LENGTHENS
 * a path, so somebody at 100% can drop back. That is honest — the path really did
 * get longer. ⚠ AND NO CERTIFICATE IS AFFECTED: a credential comes from PASSING
 * THE TEST (`learn-assessment.ts:890`), never from reaching 100%.
 */
export type PlayableProgress = {
  /** Lessons a learner can watch. The denominator. */
  playable: number;
  /** How many of THOSE they have watched. */
  completed: number;
  /** 0-100. Always 0 for a path with nothing playable, never NaN. */
  percent: number;
  /** Still to watch. Never negative. */
  remaining: number;
};

export function playableProgress(
  lessons: { id: string; vimeo_ref: string | null; production_status: string }[],
  done: Set<string> | ReadonlySet<string>
): PlayableProgress {
  const watchable = lessons.filter(isPlayable);
  const completed = watchable.filter((l) => done.has(l.id)).length;
  const playable = watchable.length;
  return {
    playable,
    completed,
    percent: playable > 0 ? Math.round((completed / playable) * 100) : 0,
    remaining: Math.max(0, playable - completed),
  };
}

/**
 * The same rule over an ALREADY-MAPPED view row — `{ playable, completed }`.
 *
 * ⚠ NOT A SECOND DEFINITION. Some reads (`getAppPath`, the provider Build Skills
 * row) hand their components rows that already carry `playable` and `completed`
 * as booleans rather than the raw `vimeo_ref`/`production_status` pair. The RULE
 * — count only playable, on BOTH sides of the ratio — lives once, here, and this
 * is the second adapter onto it.
 */
export function playableProgressOfRows(
  rows: { playable: boolean; completed: boolean }[]
): PlayableProgress {
  const watchable = rows.filter((r) => r.playable);
  const completed = watchable.filter((r) => r.completed).length;
  const playable = watchable.length;
  return {
    playable,
    completed,
    percent: playable > 0 ? Math.round((completed / playable) * 100) : 0,
    remaining: Math.max(0, playable - completed),
  };
}

/**
 * ── ⚠⚠⚠ ONE DEFINITION OF "A PATH A MEMBER CAN OPEN" (`P2-ALL-E607`) ──────
 *
 * ⚠ SCOTT, 2026-09-23: *"One definition, one place (`E585`)."*
 *
 * ⚠⚠ THE DEFECT IT CLOSES: discovery required PUBLISHED **and** playable — 12
 * paths — while `getLearnPath(slug)` required PUBLISHED alone, so **all 11
 * unstartable paths rendered 200 by direct URL.** Two definitions of the same
 * idea, and the looser one was the one a link could reach.
 *
 * ⚠ THE ENROLMENT CLAUSE IS PART OF THE DEFINITION, NOT AN EXCEPTION TO IT.
 * `E362`: hiding a path somebody is already enrolled in is the same mistake as
 * hiding a teacher's own work. ⚠⚠ SO IT LIVES HERE, WITH THE RULE — a caller
 * that remembered the playable half and forgot this one would quietly evict
 * enrolled learners, which is exactly the shape a second copy produces.
 *
 * ⚠ It takes two booleans rather than a path, because its two callers hold the
 * facts in different shapes: discovery has raw prisma rows, the path view has
 * already mapped each lesson through `isPlayable`. **Both call this; neither
 * restates it.**
 */
export function pathIsOpenTo(hasPlayableLessons: boolean, isEnrolled: boolean): boolean {
  return hasPlayableLessons || isEnrolled;
}

export function pathHasPlayableLessons(path: {
  courses: { sections: { lessons: { vimeo_ref: string | null; production_status: string }[] }[] }[];
}): boolean {
  return hasPlayableLessons(
    path.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons))
  );
}

/**
 * A Vimeo reference → an embeddable player URL.
 *
 * The column is deliberately loose about what it holds (a bare id, a
 * `vimeo.com/123` link, an already-built `player.vimeo.com` embed), because it
 * is populated from a spreadsheet by hand and insisting on one shape would mean
 * a typo silently kills a video. Returns null when nothing usable can be made,
 * so a malformed value shows "coming soon" rather than an empty black frame.
 */
export function vimeoEmbedUrl(ref: string | null | undefined): string | null {
  const raw = ref?.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return `https://player.vimeo.com/video/${raw}`;
  if (/player\.vimeo\.com\/video\/\d+/.test(raw)) {
    return raw.startsWith("http") ? raw : `https://${raw}`;
  }
  // vimeo.com/123456789 and vimeo.com/123456789/abcdef (unlisted hash)
  const m = /vimeo\.com\/(?:channels\/[^/]+\/)?(\d+)(?:\/([0-9a-z]+))?/i.exec(raw);
  if (m) {
    return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
  }
  return null;
}

/**
 * Audience facet → the label the catalog uses.
 *
 * ── ⚠⚠⚠ THIS IS AN AUDIENCE, NOT A LEVEL (`P2-A4-E611`) ─────────────────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"There is no level column — `LearningPath.audience`
 * is an audience, not a level. Label it as an audience or leave it out."*
 *
 * ⚠ THE 2026-09-21 MOCKUP SHOWS *"6 courses · Advanced"*, *"3 courses ·
 * Intermediate"*, *"5 courses · Beginner"*. ⚠⚠⚠ **NO SUCH COLUMN EXISTS.**
 * `audience` is a four-value enum — `BEGINNERS`, `END_USER`, `IMPLEMENTER`,
 * `CONTENT_CREATOR` — and three of those are not difficulty at all. An
 * implementer is not more advanced than an end user; they are a different
 * person doing a different job.
 * ⚠ `BEGINNERS` is the one value that READS like a level, which is exactly why
 * the label is rendered with `AUDIENCE_PREFIX` — *"For Beginners"* cannot be
 * misread as a difficulty rating the way a bare *"Beginners"* can.
 */
export const AUDIENCE_LABEL: Record<string, string> = {
  BEGINNERS: "Beginners",
  END_USER: "End Users",
  IMPLEMENTER: "Implementers",
  CONTENT_CREATOR: "Content Creators",
};

/**
 * ⚠ The word that makes the facet read as an audience wherever it is shown.
 * ⚠⚠ ONE CONSTANT so the path hero and the public page cannot disagree.
 */
export const AUDIENCE_PREFIX = "For";

export const AUDIENCE_ORDER = [
  "BEGINNERS",
  "END_USER",
  "IMPLEMENTER",
  "CONTENT_CREATOR",
] as const;

export const STYLE_LABEL: Record<string, string> = {
  FA_OVERVIEW: "Functional Area Overview",
  HOW_TO_USE: "How to Use",
  HOW_TO_DEPLOY: "How to Deploy",
  DAILY_JOURNAL: "Daily Journal",
  ASK_THE_EXPERT: "Ask the Expert",
};

export type BrowsePath = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  group: string | null;
  audience: string;
  lessons: number;
  playable: number;
  expert: string | null;
};

/** Every published path, with its counts, grouped for the browse page. */
/*
  ── ⚠⚠⚠ THREE DEAD EXPORTS, DELETED (`P2-A4-E608`) ───────────────────────

  ⚠ `getBrowseTree`, `getLearningPath` and `getLesson` had **no consumer
  anywhere** — confirmed across `src`, `scripts`, `e2e*` and `prisma` with
  comments stripped first, so an `E164` quote could not read as a caller.

  ⚠⚠ THEY WERE FOUND BY THE `E607` SWEEP FOR A THIRD DEFINITION, and they were
  the most dangerous kind of dead code: **each selected a path or a lesson on
  `status: "PUBLISHED"` ALONE**, with no playable clause. Anyone wiring one up
  would have re-opened the hole `E607` closed, and it would have looked like
  reuse rather than a new bug.
  ⚠ `getLearningPath` even took an `includeDraft` flag, so it could return a
  path the catalogue has never published.

  ⚠⚠⚠ UNRENDERED CODE IS UNREVIEWED CODE — the rule that already removed the
  unscoped `workOrders` count and `orderSeries`. A helper nobody calls is a
  helper nobody has checked, sitting in the file the next person will search.

  ⚠ `isPlayable`, `pathHasPlayableLessons` and `pathIsOpenTo` ABOVE ARE
  UNTOUCHED and are what live code uses.

  ⚠ SUPERSEDED, quoted not deleted (`E164`):
//   export async function getBrowseTree(): Promise<
//     { audience: string; groups: { group: string; paths: BrowsePath[] }[] }[]
//   > {
//     const paths = await prisma.learningPath.findMany({
//       where: { status: "PUBLISHED" },
//       orderBy: [{ audience: "asc" }, { group: "asc" }, { sort_order: "asc" }],
//       select: {
//         id: true,
//         title: true,
//         slug: true,
//         summary: true,
//         group: true,
//         audience: true,
//         expert: { select: { first_name: true, last_name: true } },
//         courses: {
//           select: {
//             sections: {
//               select: {
//                 lessons: { select: { vimeo_ref: true, production_status: true } },
//               },
//             },
//           },
//         },
//       },
//     });
//   
//     const flat: BrowsePath[] = paths.map((p) => {
//       const lessons = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
//       return {
//         id: p.id,
//         title: p.title,
//         slug: p.slug,
//         summary: p.summary,
//         group: p.group,
//         audience: p.audience,
//         lessons: lessons.length,
//         playable: lessons.filter(isPlayable).length,
//         expert: p.expert
//           ? `${p.expert.first_name ?? ""} ${p.expert.last_name ?? ""}`.trim() || null
//           : null,
//       };
//     });
//   
//     const byAudience = new Map<string, Map<string, BrowsePath[]>>();
//     for (const p of flat) {
//       if (!byAudience.has(p.audience)) byAudience.set(p.audience, new Map());
//       const groups = byAudience.get(p.audience)!;
//       const key = p.group ?? "Other";
//       if (!groups.has(key)) groups.set(key, []);
//       groups.get(key)!.push(p);
//     }
//   
//     return AUDIENCE_ORDER.filter((a) => byAudience.has(a)).map((audience) => ({
//       audience,
//       groups: [...byAudience.get(audience)!.entries()]
//         .sort((a, b) => a[0].localeCompare(b[0]))
//         .map(([group, paths]) => ({ group, paths })),
//     }));
//   }
//   
//   /**
//    * One path with its full outline, for the landing page.
//    *
//    * `includeDraft` exists ONLY for the admin preview (WS4) and is never derived
//    * from a query string here — the caller has to have already proved the viewer
//    * is an admin, and passes an explicit boolean. Keeping the decision at the page
//    * boundary rather than inside this function means the default read stays
//    * PUBLISHED-only and a future caller can't opt into draft rows by accident.
//    * /
//   export async function getLearningPath(slug: string, includeDraft = false) {
//     return prisma.learningPath.findFirst({
//       where: { slug, ...(includeDraft ? {} : { status: "PUBLISHED" }) },
//       select: {
//         id: true,
//         title: true,
//         slug: true,
//         summary: true,
//         group: true,
//         audience: true,
//         // Selected so a preview can tell the admin they're looking at a draft.
//         status: true,
//         expert: { select: { first_name: true, last_name: true, photo_url: true } },
//         courses: {
//           orderBy: { sort_order: "asc" },
//           select: {
//             id: true,
//             title: true,
//             style: true,
//             summary: true,
//             sections: {
//               orderBy: { sort_order: "asc" },
//               select: {
//                 id: true,
//                 title: true,
//                 lessons: {
//                   orderBy: { sort_order: "asc" },
//                   select: {
//                     id: true,
//                     title: true,
//                     run_time: true,
//                     vimeo_ref: true,
//                     production_status: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });
//   }
//   
//   /** One lesson plus the sibling list needed to render prev / next. * /
//   export async function getLesson(pathSlug: string, lessonId: string, includeDraft = false) {
//     const lesson = await prisma.lesson.findFirst({
//       where: {
//         id: lessonId,
//         section: {
//           course: {
//             learningPath: {
//               slug: pathSlug,
//               ...(includeDraft ? {} : { status: "PUBLISHED" }),
//             },
//           },
//         },
//       },
//       select: {
//         id: true,
//         title: true,
//         description: true,
//         run_time: true,
//         vimeo_ref: true,
//         production_status: true,
//         expert: { select: { first_name: true, last_name: true } },
//         section: {
//           select: {
//             id: true,
//             title: true,
//             course: {
//               select: {
//                 id: true,
//                 title: true,
//                 learningPath: { select: { id: true, title: true, slug: true } },
//               },
//             },
//           },
//         },
//       },
//     });
//     if (!lesson) return null;
//   
//     // Flat running order across the whole path, so prev/next crosses section and
//     // course boundaries the way a learner actually moves through it.
//     const path = await getLearningPath(pathSlug, includeDraft);
//     const order = (path?.courses ?? []).flatMap((c) =>
//       c.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, sectionTitle: s.title })))
//     );
//     const i = order.findIndex((l) => l.id === lessonId);
//     return {
//       lesson,
//       path,
//       prev: i > 0 ? order[i - 1] : null,
//       next: i >= 0 && i < order.length - 1 ? order[i + 1] : null,
//       position: i + 1,
//       total: order.length,
//     };
//   }
*/

