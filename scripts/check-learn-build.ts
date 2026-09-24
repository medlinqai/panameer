import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { shownRunTime, MEASURED_DURATION_SOURCE } from "@/lib/lesson-duration";
import { setPathInterest } from "@/lib/path-interest";

/**
 * ── ⚠⚠⚠ `check:learn-build` (`P2-A4-E611`) ───────────────────────────────
 *
 * The gate for the Learn restyle and the production-signal work. Every
 * assertion below is one of Scott's 2026-09-23 rulings made unbreakable.
 *
 * ⚠⚠ IT IS DB-BACKED ON PURPOSE for the catalogue-protection half: the whole
 * point of §1 is that 23 paths and 522 hand-written lessons come out the other
 * side untouched, and only a row count can say that.
 */

let pass = 0;
const fails: string[] = [];
function check(name: string, ok: boolean, why = "") {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
}

/** ⚠ Rule 12 / `E164`: superseded code is QUOTED, and a quote is not live code. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const SRC = walk("src");
const LEARN_UI = SRC.filter(
  (f) => f.startsWith(join("src", "components", "learn")) || f.startsWith(join("src", "app", "learn"))
);

async function main() {
  /* ── 1 · ⚠⚠⚠ THE CATALOGUE IS UNTOUCHED ────────────────────────────────
     ⚠ 23 paths and 522 lessons Scott wrote by hand. ⚠⚠ COUNT > 0 (`E586`):
     a zero here means the scan, not the catalogue, is what changed. */
  const [paths, lessons] = await Promise.all([
    prisma.learningPath.count(),
    prisma.lesson.count(),
  ]);
  check("1 — the catalogue still has paths", paths > 0, `${paths}`);
  check("1 — the catalogue still has lessons", lessons > 0, `${lessons}`);

  /* ⚠⚠ NO LEARN SURFACE WRITES TO `Lesson` OR `LearningPath`. Derived from the
     write verb, not from a list of files. The admin authoring console is the one
     place that may, and it is NOT part of the learner surface being restyled. */
  const catalogueWriters = LEARN_UI.filter((f) =>
    /\b(lesson|learningPath)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\b/.test(
      strip(readFileSync(f, "utf8"))
    )
  );
  check(
    "1 — no Learn page or component writes a Lesson or a LearningPath",
    catalogueWriters.length === 0,
    `${catalogueWriters.join(", ")} — this brief changes how Learn LOOKS and changes no catalogue row`
  );

  /* ── 2 · ⚠⚠⚠ NO LEVEL, BAND, STREAK OR XP RENDERS ANYWHERE IN LEARN ────
     ⚠ DERIVED FROM THE RENDERED OUTPUT (`E587`) — the scan reads every Learn
     component's JSX text, not a list of known component names.
     ⚠⚠ `E606` retired these once and the Achievements grid survived that pass,
     which is exactly why this is derived rather than a checklist. */
  check("2 — the Learn UI scan has a population (E586)", LEARN_UI.length > 10, `${LEARN_UI.length} files`);

  /*
    ⚠⚠⚠ ONLY FILES SOMETHING IMPORTS. `E164` keeps superseded components on disk
    forever, and a component nothing renders renders nothing — flagging its text
    is flagging the archive.
    ⚠ MEASURED: `public/SixStepShot.tsx` is on disk, imported by nobody, and
    contains the word `Level`. ⚠⚠ A GATE THAT FAILS ON CORRECT CODE IS A GATE
    SOMEBODY SWITCHES OFF — the same lesson `check:learn`'s statement-window
    taught an hour earlier.
    ⚠ DERIVED, NOT LISTED (`E587`): reachability is computed from the import
    graph across all of `src/`, never from a skip-list.
  */
  const allBodies = SRC.map((f) => strip(readFileSync(f, "utf8")));
  const imported = (file: string) => {
    const stem = file.replace(/\.tsx?$/, "").split("/").pop()!;
    return allBodies.some((b) => new RegExp(`from "[^"]*/${stem}"`).test(b));
  };
  const MOUNTED = LEARN_UI.filter(imported);
  check(
    "2 — the mounted-file scan has a population (E586)",
    MOUNTED.length > 5,
    `${MOUNTED.length} of ${LEARN_UI.length} Learn files are imported by something`
  );

  const BANNED = [
    { word: "streak", re: /\bstreaks?\b/i },
    { word: "XP", re: /\bXP\b/ },
    { word: "level N", re: /\blevel\s*\{?\s*\d|\bLevel\s+\d/ },
    { word: "unlocked", re: /\bunlocked\b/i },
    { word: "badge", re: /\bbadges?\b/i },
  ];
  for (const { word, re } of BANNED) {
    /* ⚠ ONLY RENDERED TEXT. A JSX text node or a string literal that reaches the
       page — not an identifier, and never a comment. */
    const offenders = MOUNTED.filter((f) => {
      const body = strip(readFileSync(f, "utf8"));
      const rendered = [...body.matchAll(/>([^<>{}]{2,120})</g)].map((m) => m[1]).join("\n");
      return re.test(rendered);
    });
    check(
      `2 — no "${word}" renders in Learn`,
      offenders.length === 0,
      `${offenders.join(", ")} — E606 retired levels, bands, streaks and XP; a new costume is the same thing`
    );
  }

  /* ⚠⚠ AND THE GRID ITSELF IS NOT MOUNTED. `E164` keeps the file on disk, so
     "it exists" proves nothing — what matters is that nothing imports it. */
  const mountsGrid = SRC.filter(
    (f) =>
      !f.endsWith(join("app", "AchievementGrid.tsx")) &&
      !f.endsWith(join("app", "ClientOnly.tsx")) &&
      /<AchievementGrid[\s/>]/.test(strip(readFileSync(f, "utf8")))
  );
  check(
    "2 — the Achievements grid is mounted nowhere",
    mountsGrid.length === 0,
    `${mountsGrid.join(", ")} — Scott: "five padlocks reading '0 of 5' is a progress system"`
  );

  /* ── 3 · ⚠⚠⚠ A DURATION IS SHOWN ONLY WHEN IT WAS MEASURED (Q6) ────────
     ⚠ Scott: *"always 5 min, plus or minus 1 minute."* The `xls` durations are
     estimates he typed before the video existed. */
  check(
    "3 — the measured source is vimeo",
    MEASURED_DURATION_SOURCE === "vimeo",
    `${MEASURED_DURATION_SOURCE}`
  );
  /* ⚠⚠ THE FIXTURE DISTINGUISHES WHAT IT COMPARES. Two nulls agree; a test that
     only proves `xls -> null` would also pass if the function always returned
     null. Both directions are asserted with the SAME run_time string. */
  const SAME = "5:00";
  check(
    "3 — a vimeo-sourced length is shown",
    shownRunTime({ run_time: SAME, duration_source: "vimeo" }) === SAME
  );
  check(
    "3 — an xls-sourced length is NOT shown",
    shownRunTime({ run_time: SAME, duration_source: "xls" }) === null,
    "an estimate rendered as a lesson length is a fabricated figure"
  );
  check(
    "3 — an unsourced length is NOT shown",
    shownRunTime({ run_time: SAME, duration_source: null }) === null
  );

  /* ⚠⚠⚠ DERIVED (`E587`): every view model that hands a `runTime` to the page
     must have passed it through `shownRunTime`. The population is every file
     assigning a `runTime:` field, found by the assignment.
     ⚠ THE ADMIN AUTHORING TREE IS THE ONE EXEMPTION AND IT IS NAMED: that
     screen reports WHAT IS STORED so an author can fix it, which is the
     opposite of presenting it to a member as a length. */
  const ADMIN_TREE = join("src", "lib", "learn-admin.ts");
  const assigners = SRC.filter((f) => /runTime:\s*(l|hit\.l)\./.test(strip(readFileSync(f, "utf8"))));
  check(
    "3 — the runTime-assignment scan has a population (E586)",
    assigners.length > 0,
    `${assigners.length} files assign a runTime`
  );
  const unfiltered = assigners.filter(
    (f) => f !== ADMIN_TREE && !/shownRunTime\(/.test(strip(readFileSync(f, "utf8")))
  );
  check(
    "3 — every learner-facing runTime goes through shownRunTime",
    unfiltered.length === 0,
    `${unfiltered.join(", ")} — a length from any source but ${MEASURED_DURATION_SOURCE} is not a measurement`
  );

  /* ⚠ AND A MISSING LENGTH IS OMITTED, NOT DASHED. Scott: *"a missing length is
     a missing fact, not an uncountable one."* */
  const dashers = LEARN_UI.filter((f) => /runTime\s*\?\?\s*"—"/.test(strip(readFileSync(f, "utf8"))));
  check(
    "3 — no Learn surface dashes a missing length",
    dashers.length === 0,
    `${dashers.join(", ")} — a dash means "we cannot count this"; an untimed lesson is simply untimed`
  );

  /* ── 4 · ⚠⚠ NO COMPLETION GATE ON THE PATH TEST (Q1) ───────────────────
     ⚠ The API has said so since `P1-ALL-E034`; the page disagreed. */
  const testPage = strip(readFileSync(join("src", "app", "learn", "[slug]", "test", "page.tsx"), "utf8"));
  check(
    "4 — the test page does not gate on completion",
    !/path\.completed\s*>=\s*path\.lessons/.test(testPage),
    'Scott: "I want to allow every panameerian to take the certification without having taken the courses"'
  );
  /* ⚠⚠ AND THE UNREADY REFUSAL IS **NOT** RELAXED WITH IT. A different rule:
     one is about what the member has done, the other about whether the material
     exists. ⚠ Asserting only the deletion would let both go at once. */
  const testRoute = strip(
    readFileSync(join("src", "app", "api", "learn", "test", "[pathId]", "route.ts"), "utf8")
  );
  check(
    "4 — the unready-path refusal survives",
    /pathIsOpenTo\(pathHasPlayableLessons\(path\), false\)/.test(testRoute),
    "E607's refusal is a different rule and is not being relaxed"
  );

  /* ── 5 · ⚠⚠⚠ AN UNREADY PATH NEVER LOOKS STARTABLE (Q4) ────────────────
     ⚠ The ring and the stage rail are gated on `path.ready`, and Enroll is
     rendered disabled with a reason rather than removed. */
  const appPath = strip(readFileSync(join("src", "components", "learn", "app", "AppPath.tsx"), "utf8"));
  check("5 — the progress ring is gated on ready", /\{path\.ready && \(?\s*<ProgressRing/.test(appPath));
  /* ⚠⚠⚠ THE STAGE RAIL IS THE TEST NODE AND THE CERTIFICATE NODE — NOT THE
     OUTLINE. ⚠ My first version of this assertion pinned `PathSpine`, which is
     the course outline, and it passed while the page rendered `E607`'s *"the
     outline below is real"* above an empty space. **A gate can be green about
     the wrong noun.** Caught in the screenshot, not by the gate. */
  check(
    "5 — the stage nodes are gated on ready",
    /\{path\.ready && \(\s*<>/.test(appPath),
    "Enrolled -> Courses -> Path Test -> Certificate are unreachable on an unready path"
  );
  /* ⚠⚠ AND THE OUTLINE IS **NOT** GATED. Asserting only the line above would be
     satisfied by hiding everything, which is the defect I actually shipped. */
  check(
    "5 — the course outline always renders",
    /\n\s*<PathSpine path=\{path\} \/>/.test(appPath),
    "E607's notice promises the outline below it; reading is never gated"
  );
  check(
    "5 — Enroll still renders on an unready path, disabled",
    /!path\.ready \?[\s\S]{0,400}?notReady/.test(appPath),
    'Scott: "a disabled button that says why teaches; a hidden one looks broken"'
  );
  const enrollBtn = strip(
    readFileSync(join("src", "components", "learn", "EnrollButton.tsx"), "utf8")
  );
  check(
    "5 — the disabled Enroll carries a reason",
    /notReady\)?\s*\{[\s\S]{0,900}?disabled[\s\S]{0,900}?no videos in this path yet/.test(enrollBtn),
    "a control that refuses without saying why is a door onto a wall"
  );

  /* ── 6 · ⚠⚠ THE PATH FORUM PANEL REACHES A SIGNED-IN MEMBER (Q8) ───────
     ⚠ It previously rendered only on the signed-OUT branch, where `canOpen` is
     false by `canAccessPathForum`'s first line — so it reached nobody. */
  check("6 — AppPath renders the forum panel", /<PathForumPanel\s/.test(appPath));
  check(
    "6 — the panel is fed by the view model, not re-queried in the component",
    !/prisma\./.test(appPath),
    "a component that queries is a second source of truth for who may open the room"
  );

  /* ── 7 · ⚠⚠⚠ THE TWO CATALOGUE FIGURES ARE NEVER SUMMED ────────────────
     ⚠ 12 startable and 11 in production do not combine into 23 anywhere a
     member can see. Derived from the live catalogue, not from the literals. */
  const published = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    select: {
      courses: { select: { sections: { select: { lessons: { select: { vimeo_ref: true, production_status: true } } } } } },
    },
  });
  const { isPlayable } = await import("@/lib/learn");
  const startable = published.filter((p) =>
    p.courses.some((c) => c.sections.some((s) => s.lessons.some(isPlayable)))
  ).length;
  const unready = published.length - startable;
  check(
    "7 — the catalogue really does split (E586)",
    startable > 0 && unready > 0,
    `${startable} startable · ${unready} unready — an assertion about a split needs one`
  );
  const summed = String(startable + unready);
  const summedOffenders = LEARN_UI.filter((f) => {
    const body = strip(readFileSync(f, "utf8"));
    const rendered = [...body.matchAll(/>([^<>{}]{2,160})</g)].map((m) => m[1]).join("\n");
    return new RegExp(`\\b${summed}\\s+(paths|learning paths)\\b`, "i").test(rendered);
  });
  check(
    "7 — no Learn surface prints the two figures added together",
    summedOffenders.length === 0,
    `${summedOffenders.join(", ")} — "${summed} paths" merges what a member can start with what they cannot`
  );

  /* ── 8 · ⚠⚠ NO COPY PROMISES A DATE, AN ETA, OR A MECHANISM WITH NO WRITER ─ */
  const PROMISES = [
    /\bcoming soon\b/i,
    /* ⚠⚠⚠ `P2-A4-E613` — A BARE "Soon" IS THE SAME PROMISE IN FEWER WORDS.
       `PathSpine` carried one as a chip on every unplayable lesson and `E611`'s
       sweep missed it because the sweep looked for sentences. ⚠ Anchored so it
       cannot match "Soonest" or a word ending in it. */
    /(^|[\s>(])soon\b/i,
    /\bwe'?ll email you\b/i,
    /\bnotify you\b/i,
    /\bshortly\b/i,
    /\bin the next few (days|weeks)\b/i,
  ];
  const promisers: string[] = [];
  for (const f of MOUNTED) {
    const body = strip(readFileSync(f, "utf8"));
    const rendered = [...body.matchAll(/>([^<>{}]{2,200})</g)].map((m) => m[1]).join("\n");
    if (PROMISES.some((r) => r.test(rendered))) promisers.push(f);
  }
  check(
    "8 — no Learn copy promises a date or an unbuilt mechanism",
    promisers.length === 0,
    `${promisers.join(", ")} — the schema holds no publish date, and a page may not promise a mechanism with no writer`
  );

  /* ── 9 · ⚠⚠⚠ THE DEMAND SIGNAL (WS-C) ──────────────────────────────────
     ⚠ Scott: *"idempotency and withdrawal proven."* ⚠⚠ THE FIXTURE IS SEEDED
     AND TORN DOWN BY PRIMARY KEY IN A `finally`, and it seeds NO `Lesson` and
     NO `LearningPath` — it borrows a path that already exists. */
  const probePath = await prisma.learningPath.findFirst({
    where: { status: "PUBLISHED" },
    select: { id: true },
  });
  const probeUser = await prisma.user.findFirst({ select: { id: true } });
  check(
    "9 — the probe has a path and a user to work with (E586)",
    Boolean(probePath && probeUser),
    "a gate with no inputs must fail, not report success"
  );

  if (probePath && probeUser) {
    let probeId: string | null = null;
    try {
      const before = await prisma.pathInterest.count({
        where: { learning_path_id: probePath.id, wanted: true },
      });

      /* ⚠⚠ IDEMPOTENT: press it twice, one row. */
      await setPathInterest(probeUser.id, probePath.id, true);
      await setPathInterest(probeUser.id, probePath.id, true);
      const rows = await prisma.pathInterest.count({
        where: { user_id: probeUser.id, learning_path_id: probePath.id },
      });
      probeId =
        (
          await prisma.pathInterest.findUnique({
            where: {
              user_id_learning_path_id: {
                user_id: probeUser.id,
                learning_path_id: probePath.id,
              },
            },
            select: { id: true },
          })
        )?.id ?? null;
      check("9 — pressing twice writes one row", rows === 1, `${rows} rows`);

      /* ⚠⚠⚠ THE FIXTURE DISTINGUISHES WHAT IT COMPARES. `before` and `after`
         must DIFFER, or an assertion that they match would pass on a writer
         that does nothing. */
      const afterWant = await prisma.pathInterest.count({
        where: { learning_path_id: probePath.id, wanted: true },
      });
      check(
        "9 — the count went up by exactly one",
        afterWant === before + 1,
        `${before} -> ${afterWant}`
      );

      /* ⚠⚠ WITHDRAWAL IS RECORDED, NOT DELETED. */
      await setPathInterest(probeUser.id, probePath.id, false);
      const afterWithdraw = await prisma.pathInterest.count({
        where: { learning_path_id: probePath.id, wanted: true },
      });
      const stillThere = await prisma.pathInterest.count({
        where: { user_id: probeUser.id, learning_path_id: probePath.id },
      });
      check(
        "9 — withdrawing removes the vote",
        afterWithdraw === before,
        `${afterWant} -> ${afterWithdraw}`
      );
      check(
        "9 — withdrawing does NOT delete the row",
        stillThere === 1,
        "a delete erases the rows the count reads, so the figure could never fall for a stated reason"
      );
    } finally {
      /*
        ⚠ BY PRIMARY KEY, IN A `finally`.
        ⚠⚠⚠ `deleteMany`, NOT `delete`, AND THAT IS NOT A STYLE CHOICE. A
        `delete` on a row a MUTATION has already removed throws
        `RecordNotFound`, the process dies inside `finally`, and **the failures
        recorded moments earlier are never printed** — the run reports
        `no-summary-line` instead of the assertion that caught the bug.
        ⚠ MEASURED: the withdrawal-deletes mutation produced NO OUTPUT AT ALL
        until this changed. **A teardown that can throw is a teardown that can
        hide the result it was protecting.**
      */
      if (probeId) await prisma.pathInterest.deleteMany({ where: { id: probeId } });
    }
  }

  /* ⚠⚠ AND NO COPY PROMISES A NOTIFICATION. `check:learn-build` §8 already bans
     the date words; this bans the one claim WS-C is most tempted to make. */
  const wantBtn = strip(
    readFileSync(join("src", "components", "learn", "WantThisButton.tsx"), "utf8")
  );
  check(
    "9 — the demand control promises no notification",
    !/we'?ll (email|let you know|tell you)|notify/i.test(wantBtn),
    "nothing mails anybody when a video lands, so no copy may say it will"
  );
  /* ⚠ AND IT IS NOT AN ANONYMOUS COUNTER (Scott: *"a count anybody can inflate
     is worse than no count"*). */
  const interestRoute = strip(
    readFileSync(join("src", "app", "api", "learn", "interest", "route.ts"), "utf8")
  );
  check(
    "9 — the demand writer refuses a signed-out caller",
    /if \(!viewer\)[\s\S]{0,200}?401/.test(interestRoute),
    "a count anybody can inflate is worse than no count"
  );
  /* ⚠⚠⚠ AND IT IS NOT A SECOND ENROLMENT DOOR. Wanting a path that does not
     exist yet is the opposite of joining one. */
  check(
    "9 — the demand writer never writes a LearnEnrollment",
    !/learnEnrollment\./.test(interestRoute),
    "enrolment is forum membership; an interest vote is not"
  );

  /* ── 10 · ⚠⚠⚠ NO STORED STATUS CLAIMS A URL IT HAS NOT GOT (`P2-A4-E613`) ─

     ⚠⚠ THE DEFECT THIS BRIEF EXISTS TO REMOVE: `production_status` saying a
     video was added while `vimeo_ref` is empty. ⚠ Readiness is `isPlayable` and
     only `isPlayable` — derived at run time (`E587`), never a stored claim.
     ⚠ Count > 0 (`E586`). */
  const allLessons = await prisma.lesson.findMany({
    select: { id: true, vimeo_ref: true, production_status: true },
  });
  check("10 — there are lessons to check (E586)", allLessons.length > 0, `${allLessons.length}`);
  const { urlMissing, isPlayable: isPlayableFn } = await import("@/lib/learn");
  const amber = allLessons.filter(urlMissing);

  /* ⚠⚠⚠ ZERO INSIDE THE FOUR PATHS SCOTT RULED ON — asserted against the
     DATABASE, not against the script that wrote it. A repair proved only by its
     own script is not proved. */
  const RULED = [
    "How to Implement",
    "End-to-End Business Processing (Buying Channels)",
    "How to Configure",
    "Implementers",
  ];
  const ruledPaths = await prisma.learningPath.findMany({
    where: { title: { in: RULED } },
    select: {
      title: true,
      courses: {
        select: {
          sections: { select: { lessons: { select: { vimeo_ref: true, production_status: true } } } },
        },
      },
    },
  });
  check(
    "10 — the four ruled paths were all found (E586)",
    ruledPaths.length === RULED.length,
    `${ruledPaths.length} of ${RULED.length} — a missing path makes the next assertion vacuous`
  );
  for (const rp of ruledPaths) {
    const ls = rp.courses.flatMap((c) => c.sections.flatMap((sx) => sx.lessons));
    check(
      `10 — "${rp.title}" claims no URL it has not got`,
      ls.filter(urlMissing).length === 0,
      `${ls.filter(urlMissing).length} still amber — Scott ruled on this path and the write did not take`
    );
  }

  /*
    ── ⚠⚠⚠ ZERO. NOT A CEILING ANY MORE (`P2-A4-E614`, ruling 19) ───────────

    ⚠⚠ SCOTT, 2026-09-24: **"NONE OF THEM WERE FILMED. Mark all 18 Planned."**
    ⚠⚠⚠ **"The catalogue-wide false-claim count must then be ZERO, and the
    gate's ceiling drops to 0 — after this there is no honest reason for any
    lesson to claim a video it does not have, so a new one is a build failure,
    not a backlog item."**

    ⚠ THE HISTORY, SO NOBODY RE-RAISES THE CEILING TO MAKE A RED GO AWAY:
    `E613` cleared 41 in the four paths Scott called and left 18 standing
    because nobody had ruled on them — a ceiling of 18 was the honest way to
    hold a measured, dated gap without pretending it was fine. ⚠⚠ Ruling 19
    closed it. **There is no gap left to hold, so there is no ceiling.**
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const AMBER_CEILING = 18;
    //   check("10 — ⚠⚠ no NEW lesson claims a URL it has not got",
    //     amber.length <= AMBER_CEILING, …);
  */
  check(
    "10 — ⚠⚠⚠ NO lesson claims a URL it has not got",
    amber.length === 0,
    `${amber.length} amber — ruling 19 took this to zero on 2026-09-24; a lesson claiming a video it has not got is now a build failure, not a backlog item`
  );
  if (amber.length > 0) {
    const named = await prisma.lesson.findMany({
      where: { id: { in: amber.map((l) => l.id) } },
      select: {
        title: true,
        section: { select: { course: { select: { learningPath: { select: { title: true } } } } } },
      },
    });
    console.log(`\n  ⚠⚠ ${amber.length} lesson(s) claim a URL with no vimeo_ref:`);
    for (const l of named.slice(0, 20))
      console.log(`      ${l.section.course.learningPath.title} › ${l.title.slice(0, 50)}`);
  }

  /* ⚠⚠ AND THE OTHER HALF, WITHOUT WHICH ZERO PROVES NOTHING. An empty
     catalogue has zero false claims too. `URL_ADDED_TO_LESSON` and the playable
     count must AGREE — every lesson claiming a URL has one, and there are some. */
  const claiming = allLessons.filter((l) =>
    (["URL_ADDED_TO_LESSON", "BLOG_CREATED", "BLOG_RELEASED"] as string[]).includes(
      l.production_status
    )
  ).length;
  const playableNow = allLessons.filter(isPlayableFn).length;
  check(
    "10 — ⚠⚠ and the claim and the video agree, on a catalogue that has both",
    claiming > 0 && claiming === playableNow,
    `${claiming} claim a URL, ${playableNow} actually play — two zeros would agree too, which is why both are asserted`
  );

  /* ── 11 · ⚠⚠ THE REPAIR WROTE ONE COLUMN, DERIVED FROM ITS SOURCE ──────── */
  const repair = strip(
    readFileSync(join("prisma", "repairs", "E613-apply-scotts-four-calls.ts"), "utf8")
  );
  const updateBodies = [...repair.matchAll(/lesson\.update\(\{[\s\S]*?\}\);/g)].map((m) => m[0]);
  check("11 — the repair's write was found by the scan (E586)", updateBodies.length > 0);
  for (const body of updateBodies) {
    const fields = [...body.matchAll(/data:\s*\{([^}]*)\}/g)]
      .flatMap((m) => m[1].split(","))
      .map((f) => f.split(":")[0].trim())
      .filter(Boolean);
    check(
      "11 — ⚠⚠⚠ production_status is the ONLY Lesson column the repair writes",
      fields.length === 1 && fields[0] === "production_status",
      `wrote [${fields.join(", ")}] — one column, and it is not the others`
    );
  }
  check(
    "11 — the repair never creates or deletes a Lesson",
    !/lesson\.(create|createMany|delete|deleteMany)\b/.test(repair),
    "no Lesson created, no Lesson deleted"
  );
  check(
    "11 — and it never touches LearningPath",
    !/learningPath\.(create|update|updateMany|upsert|delete|deleteMany)\b/.test(repair),
    "LearningPath is not touched at all"
  );

  await prisma.$disconnect();

  console.log(`check:learn-build — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (fails.length) process.exit(1);
}

main();
