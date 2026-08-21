/**
 * `check:learn-review` — a certificate is only ever issued from a set a HUMAN
 * published (brief_learn_certification_tests WS5).
 *
 * FIVE PROPERTIES:
 *
 *   1  A `DRAFT` set is not sittable; a `PUBLISHED` one is.
 *   2  Publishing ALWAYS writes `reviewed_by` and `reviewed_at`. ⚠ This is the
 *      field `P1-J2.4-E024`'s Expert badge waits on — a publish that leaves it
 *      null makes that badge unearnable all over again.
 *   3  A set that falls below the generator's own floor cannot be published,
 *      whether it got there by dropping or by regenerating.
 *   4  The learner payload NEVER contains `correctIndex`; the admin one always does.
 *   5  Unpublishing does not delete attempts.
 *
 * ⚠ THIS GUARD PUBLISHES NOTHING. Publishing is Scott's act, and a check that
 * published a row to prove publishing works would be the machine doing the one
 * thing the whole review gate exists to stop. Every assertion is a source
 * property, a pure-function property, or a READ of the live database.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN — this file names every token it
 * forbids, and a scanner that read comments would fail on its own documentation.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import {
  MIN_REVIEWED_QUESTIONS,
  toPublicQuestions,
  type AssessmentQuestion,
} from "@/lib/learn-assessment";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const SELF = join("scripts", "check-learn-review.ts");
const bodies = new Map(
  [...walk("src"), ...walk("scripts"), ...walk("prisma").filter((f) => /\.ts$/.test(f))]
    .filter((f) => f !== SELF)
    .map((f) => [f, stripComments(readFileSync(f, "utf8"))])
);

const LIB = join("src", "lib", "learn-assessment.ts");
const ADMIN_API = join("src", "app", "api", "admin", "learn", "paths", "[id]", "assessment", "route.ts");
const SCREEN = join("src", "components", "admin", "AssessmentReview.tsx");
for (const f of [LIB, ADMIN_API, SCREEN]) {
  check(`the file this guard is about exists: ${f}`, bodies.has(f));
}
const lib = bodies.get(LIB) ?? "";
const api = bodies.get(ADMIN_API) ?? "";
const screen = bodies.get(SCREEN) ?? "";

// ---------------------------------------------------------------------------
// 1 — DRAFT is not sittable, PUBLISHED is
// ---------------------------------------------------------------------------

check(
  "1 — the sit path refuses a non-PUBLISHED row",
  /getPublishedAssessment[\s\S]{0,700}status !== "PUBLISHED"[\s\S]{0,300}AssessmentNotReady/.test(lib),
  "without this a DRAFT set awards certificates"
);
check(
  "1 — grading also refuses anything but PUBLISHED",
  /gradeAttempt[\s\S]{0,600}getPublishedAssessment\(/.test(lib),
  "a learner who bypasses the read must not be gradeable"
);
check(
  "1 — the test state reports ready ONLY for PUBLISHED",
  /ready:\s*assessment\?\.status === "PUBLISHED"/.test(lib)
);
check(
  "1 — nothing that WRITES questions also publishes them",
  !/questions:[\s\S]{0,200}status:\s*"PUBLISHED"/.test(lib) &&
    !/status:\s*"PUBLISHED"[\s\S]{0,200}questions:/.test(lib),
  "generation must never be its own review"
);

// ---------------------------------------------------------------------------
// 2 — publishing always attributes
// ---------------------------------------------------------------------------

/*
  ⚠ ASSERTED AS "EVERY WRITE OF status: PUBLISHED CARRIES BOTH STAMPS", not as
  "publishAssessment contains them". A second call site that set the status
  without the stamps would pass the weaker form and re-break the Expert badge.
*/
/*
  ⚠ SCOPED TO `learnAssessment` WRITES, AND THAT NARROWING IS CORRECT RATHER THAN
  CONVENIENT. `PackageStatus`, `LearnPublishStatus` on a LearningPath and the
  seeds all legitimately write `status: "PUBLISHED"` and have no reviewer to
  stamp — the first version of this scan flagged `lib/packages.ts` and two seeds.
  The property is about ASSESSMENT publishes; the scan now says so.
*/
const publishWrites = [...bodies.entries()].flatMap(([f, b]) =>
  [...b.matchAll(/status:\s*"PUBLISHED"/g)]
    .map((m) => ({ f, at: m.index ?? 0, b }))
    .filter(({ b: body, at }) => /learnAssessment/.test(body.slice(Math.max(0, at - 400), at)))
);
check(
  "2 — there is at least one publish write to judge",
  publishWrites.length > 0,
  `${publishWrites.length}`
);
const unstamped = publishWrites.filter(({ b, at }) => {
  const win = b.slice(Math.max(0, at - 260), at + 260);
  /* A `where` clause reading the status is a FILTER, not a write. */
  if (/where:\s*\{[^}]*status/.test(win) && !/data:\s*\{/.test(win)) return false;
  if (!/data:\s*\{/.test(win)) return false;
  return !(/reviewed_by/.test(win) && /reviewed_at/.test(win));
});
check(
  "2 — every write of status PUBLISHED also writes reviewed_by AND reviewed_at",
  unstamped.length === 0,
  unstamped.map((u) => u.f).join(", ")
);
check(
  "2 — publishing REFUSES an account with no Person rather than attributing to nobody",
  /publishAssessment[\s\S]{0,1400}person\.findUnique[\s\S]{0,300}if \(!person\)/.test(lib),
  "the Expert badge cannot be earned from an anonymous publish"
);
check(
  "2 — unpublishing does NOT clear the stamps — a review that happened still happened",
  /unpublishAssessment[\s\S]{0,700}data:\s*\{\s*status:\s*"DRAFT"\s*\}/.test(lib) &&
    !/unpublishAssessment[\s\S]{0,700}reviewed_by:\s*null/.test(lib)
);

// ---------------------------------------------------------------------------
// 3 — the floor
// ---------------------------------------------------------------------------

check("3 — the floor is exported and is the generator's own", MIN_REVIEWED_QUESTIONS === 5);
check(
  "3 — dropping refuses to take a set below the floor",
  /dropQuestions[\s\S]{0,900}kept\.length < MIN_REVIEWED_QUESTIONS[\s\S]{0,200}TOO_FEW/.test(lib)
);
/*
  ⚠ BOTH GATES, BECAUSE THEY ARE SEPARATE REQUESTS. A set can be shrunk by a
  regenerate between the drop and the publish, so checking only at drop time is
  checking at the wrong end.
*/
check(
  "3 — publishing checks the floor AGAIN, independently of the drop",
  /publishAssessment[\s\S]{0,900}questions\.length < MIN_REVIEWED_QUESTIONS[\s\S]{0,200}TOO_FEW/.test(lib)
);
check(
  "3 — and the screen says so before the click rather than surfacing a 409",
  /belowFloor/.test(screen) && /disabled=\{busy !== null \|\| belowFloor\}/.test(screen)
);
/*
  ⚠ LOWERING THE FLOOR IS HOW A CERTIFICATE STOPS MEANING ANYTHING — the same
  argument MIN_LESSONS carries in the batch script. Pinned so a future "just let
  this one through" has to argue with a red build.
*/
check(
  "3 — the batch generator still refuses paths below MIN_LESSONS",
  /MIN_LESSONS = 2/.test(bodies.get(join("prisma", "generate-learn-assessments.ts")) ?? "")
);

// ---------------------------------------------------------------------------
// 4 — the learner never sees the answer
// ---------------------------------------------------------------------------

const FIXTURE: AssessmentQuestion[] = [
  {
    id: "q1",
    question: "Which journal records non-monetary amounts?",
    options: ["Recurring", "Statistical", "Allocation"],
    correctIndex: 1,
    explanation: "Statistical journals carry units, not currency.",
    courseTitle: "The Fundamentals of Journals",
    lessonId: "lesson-1",
    sourceKind: "LESSON",
  },
];
const publicJson = JSON.stringify(toPublicQuestions(FIXTURE));
check("4 — the learner payload drops correctIndex", !/correctIndex/.test(publicJson), publicJson);
check("4 — it drops the explanation too, until after the attempt", !/explanation/.test(publicJson));
/*
  ⚠ `lessonId` AND `sourceKind` ARE WITHHELD AS WELL, and that is the file's own
  reasoning: they exist for the REVIEWER, and a learner mid-test has nothing to
  gain from them and something to reverse-engineer.
*/
check("4 — and lessonId / sourceKind, which exist for the reviewer", !/lessonId|sourceKind/.test(publicJson));
check("4 — but the question and its options survive", /Statistical/.test(publicJson) && /Which journal/.test(publicJson));
check(
  "4 — the ADMIN route returns the raw questions, answers included",
  /readQuestions\(row\)/.test(api) && !/toPublicQuestions/.test(api),
  "you cannot judge a question without seeing which answer it expects"
);
check(
  "4 — and it is behind canAdminister on every verb",
  (api.match(/guardApi\("canAdminister"\)/g) ?? []).length >= 3,
  "GET, POST and PATCH each need their own gate"
);

// ---------------------------------------------------------------------------
// 5 — unpublish is not delete, and review is not authoring
// ---------------------------------------------------------------------------

check(
  "5 — nothing in the review path deletes an attempt",
  !/learnTestAttempt\.delete|testAttempt\.delete|attempts:\s*\{\s*delete/.test(lib) &&
    !/delete/.test(api),
  "someone who passed last week passed a real test"
);
check(
  "5 — attempts survive a regenerate too, and the route says why",
  /upsert\(/.test(api)
);
/*
  ⚠ REVIEW IS NOT AUTHORING. Scott will not hand-build question banks, so the
  screen may not grow an editor. Asserted by shape: no writable field bound to a
  question's text.
*/
check(
  "5 — the review screen offers no way to author or reword a question",
  !/<textarea|contentEditable|addQuestion|newQuestion/.test(screen),
  "the remedy for a bad set is REGENERATE, not repair"
);
check(
  "5 — the only per-question action is DROP",
  /type="checkbox"/.test(screen) && /action: "drop"/.test(screen) === false
);
check(
  "5 — the screen surfaces the lesson each question tests",
  /lessonTitle/.test(screen),
  "P1-J3-E006: the fastest way to spot a title-only guess"
);
check(
  "5 — and whether that lesson has a description at all",
  /described/.test(screen) && /Title only/.test(screen),
  "the signal that a question was written from a string, not a lesson"
);
check("5 — and the provenance the reviewer needs", /sourceNote/.test(screen));

// ---------------------------------------------------------------------------
// live database — read only
// ---------------------------------------------------------------------------

async function live() {
  const rows = await prisma.learnAssessment.findMany({
    select: { status: true, reviewed_by: true, reviewed_at: true, learning_path_id: true },
  });
  check("live — there are sets to judge", rows.length > 0, `${rows.length}`);
  /*
    ⚠ THE INVARIANT THAT OUTLIVES THIS BRIEF: a PUBLISHED row without both stamps
    is a certificate nobody signed for. Checked against the real table, not just
    the code that writes it.
  */
  const bad = rows.filter((r) => r.status === "PUBLISHED" && (!r.reviewed_by || !r.reviewed_at));
  check(
    "live — no PUBLISHED set is missing its reviewer or its review date",
    bad.length === 0,
    bad.map((b) => b.learning_path_id).join(", ")
  );

  await prisma.$disconnect();

  if (failures.length > 0) {
    console.error(`check:learn-review — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:learn-review — ${pass}/${pass} passed`);
  const byStatus = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
  console.log(
    `  (live: ${rows.length} set(s) — ` +
      Object.entries(byStatus).map(([k, n]) => `${k}=${n}`).join(" ") +
      `; floor ${MIN_REVIEWED_QUESTIONS})`
  );
}

void live();
