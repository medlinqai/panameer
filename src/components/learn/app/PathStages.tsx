import Link from "next/link";
import { StepDisc, StepConnector, type StepState } from "@/components/casing/StepDisc";
import type { AppPathView } from "@/lib/learn-path-app";

/**
 * ── ⚠⚠⚠ THE STAGE RAIL (brief 9 WS-C item 1) ────────────────────────────
 *
 * ⚠ SCOTT'S MOCKUP NOTE: *"The same stage tags as a WORK record: Enrolled →
 * Courses → Path Test → Certificate, so the whole app speaks one pattern."*
 * ⚠⚠ The brief: **"THE STAGE RAIL IS THE POINT OF THIS PAGE AND IT DOES NOT
 * EXIST… It is the one element that makes Learn belong to the product."**
 *
 * ⚠⚠⚠ **WHERE THE VOCABULARY CAME FROM, AND WHY IT IS NOT THE WORK RECORD'S:
 * see `StepDisc.tsx`.** Short version, because ruling 53a says a reuse claim
 * must name its file: `sourcing-stage.ts` exists, is importable, and is imported
 * by **two gates and nothing else** — no component, no page — so there is no
 * WORK-record rail to copy; and its seven words describe **a provider's position
 * in a buyer's process**, not a learner's own progress. The disc, the connector
 * and the done/current/upcoming palette come from `PageTabs`' `process` mode,
 * which `nav.ts` records as **built, asserted and with no consumer** until now.
 *
 * ── ⚠⚠⚠ THE CURRENT STAGE IS THE FIRST ONE NOT DONE. THAT IS THE WHOLE RULE. ─
 *
 * ⚠ Nothing is stored and nothing is ordered by hand: each stage carries its own
 * `done` predicate, and the first that is false is where the member is standing.
 * ⚠⚠ **SO THE RAIL CANNOT GO STALE**, which is the same argument
 * `sourcing-stage.ts` makes for deriving rather than storing a stage: *"a stored
 * stage is a second fact about the same thing."*
 * ⚠ When every stage is done there is **no current stage** and four ticks, which
 * is the truth — not a fifth stage inventing somewhere else to be.
 *
 * ── ⚠⚠⚠ EVERY `done` HAS A WRITER, AND THAT WAS CHECKED BEFORE BUILDING ──
 *
 *   `Enrolled`     `path.enrolled`            ← `LearnEnrollment`, written by
 *                                               the enrol route
 *   `Courses`      `path.percent === 100`     ← `LessonProgress`; the route
 *                                               DELETES the row when `completed`
 *                                               is false, so a row exists **iff**
 *                                               the lesson was completed
 *   `Path Test`    `path.test.passed`         ← the attempt's own result
 *   `Certificate`  `path.certificate.earned`  ← `learn-assessment.ts`, on a pass
 *
 * ⚠⚠ **NO STAGE IS A DASH, BECAUSE NONE OF THEM IS UNCOUNTABLE** (the counting
 * rules, rule 1). ⚠ And `0% Courses` is a **MEASURED ZERO printed in ink**
 * (ruling 53c), not an absence.
 *
 * ── ⚠⚠⚠ A STAGE IS A LINK ONLY WHERE THERE IS SOMEWHERE TO GO ────────────
 *
 * ⚠⚠ `Enrolled` has **no destination at all** — it is a state, not a place. ⚠ So
 * it renders as a `<span>`, not as a `<Link>` to something invented. **That is
 * why this is not a `PageTabs` call**, and it is `E579`: a control that goes
 * nowhere is a door onto a wall.
 * ⚠⚠⚠ **AND THE ONES THAT ARE NOT LINKS ARE NOT GREYED-OUT BUTTONS EITHER.**
 * There is no `disabled` here and `StepDisc` offers no `locked` state, so ruling
 * 26a's padlock cannot come back through this component. **Ruling 54: the test
 * is open to anyone — the test's difficulty is the gate.**
 * ⚠ `Path Test` links when the QUESTION SET is published (`test.ready`) and not
 * otherwise, because a test page with no published set is a door onto a wall —
 * ⚠⚠ and that is a fact about **the test**, never about the member.
 */
type Stage = {
  label: string;
  done: boolean;
  /** ⚠ `null` = no destination exists. Renders as text, never as a dead link. */
  href: string | null;
  /**
   * ── ⚠⚠⚠ THE FOURTH STATE, AND IT CARRIES ITS OWN REASON ────────────────
   *
   * ⚠ **PRESENT = THIS PATH CANNOT REACH THIS STAGE, AND THIS SENTENCE SAYS
   * WHY.** ⚠⚠ Optional, so a reachable stage costs nothing — but **when it is
   * present it is a string, so an unavailable stage with no reason cannot be
   * expressed.** That is `PatternHeader`'s rule in a second place: *a dash
   * without a reason cannot be printed.*
   *
   * ⚠⚠⚠ **SCOTT OVERTURNED MY CALL HERE, AND THE FRAMING WAS THE DEFECT:**
   * *"Uniform versus honest is a false choice: a rail already carries states —
   * done, current, upcoming — so 'not available on this path' is another state,
   * not a missing node."* ⚠ I had kept four stages and let `Certificate` render
   * as an ordinary upcoming step on a path that awards none. ⚠⚠ **THAT IS
   * `E579`: a node that looks like a destination where nothing can be earned.**
   * ⚠ My own note that it *"sits oddly beside the certificate stat I just
   * removed"* was the defect talking, not taste.
   *
   * ⚠⚠ **THE SHAPE STAYS THE PATTERN, THE CONTENT STAYS HONEST.** Four stages
   * everywhere, so the rail is still one thing the whole app speaks.
   */
  unavailable?: string;
};

/**
 * ⚠⚠ THE DERIVATION, EXPORTED AND PURE, so `check:learn-views` can drive every
 * rung from a fixture rather than asserting a screenshot (`E607` — arithmetic
 * inline in a component cannot be driven by a fixture).
 * ⚠ It takes the four facts it needs and not the whole view model, so a gate
 * does not have to build a 40-field object to test one transition.
 */
export function pathStages(p: {
  slug: string;
  enrolled: boolean;
  percent: number;
  /**
   * ⚠⚠ WHETHER AN ASSESSMENT ROW EXISTS AT ALL — **not whether it is open.**
   * ⚠⚠⚠ THE TWO ARE DIFFERENT FACTS AND CONFLATING THEM IS HOW THE PADLOCK
   * COMES BACK: `testReady` says the question set is PUBLISHED (ruling 54 — a
   * fact about the test, never about the member), while this says the path has
   * a test in the first place. ⚠ **15 of 23 paths have neither.**
   */
  testExists: boolean;
  testReady: boolean;
  testPassed: boolean;
  certificateEarned: boolean;
  certificateUrl: string | null;
}): Stage[] {
  return [
    /* ⚠ NO HREF. Enrolment is a state; there is no "enrolled page". */
    { label: "Enrolled", done: p.enrolled, href: null },
    /*
      ⚠⚠ THE PERCENTAGE IS IN THE LABEL because the mockup puts it there and it
      is the one stage with a partial reading — `Enrolled` and `Certificate` are
      binary, and a test is passed or it is not.
      ⚠ The anchor is the outline directly below this rail, which is a REAL
      destination on this page (see `id="path-courses"` in `AppPath`).
    */
    { label: `${p.percent}% Courses`, done: p.percent === 100, href: "#path-courses" },
    /*
      ⚠⚠⚠ RULING 54 — LINKED WHENEVER THE SET IS PUBLISHED, AT ANY PROGRESS.
      ⚠ Not gated on `percent`, not gated on `enrolled`: *"we used to require you
      to watch the classes to get the test...but that changed in this version."*
      ⚠⚠ `E627` fixed this same gate in three other places on this page; a fourth
      copy here would have re-introduced it in a component nobody was watching,
      which is exactly what ruling 53b warns about.
    */
    {
      label: "Path Test",
      done: p.testPassed,
      href: p.testReady ? `/learn/${p.slug}/test` : null,
      /*
        ⚠⚠ NO TEST ON THE PATH AT ALL IS A DIFFERENT STATE FROM A TEST THAT IS
        NOT OPEN YET. ⚠ A DRAFT set is **not** unavailable — the test exists and
        the test page says so honestly — it is simply not linked. ⚠⚠⚠ **ONLY
        THE ABSENCE OF THE ROW EARNS THE REASON**, or this would become ruling
        26a's gate wearing a new word.
      */
      ...(p.testExists ? {} : { unavailable: "This path has no test." }),
    },
    /*
      ⚠ THE CERTIFICATE'S ONLY DESTINATION IS THE ONE IT HAS WHEN IT EXISTS.
      ⚠⚠ `verifyUrl` is null until it is earned, so this is the type saying what
      a comment would otherwise have to remember.
      ⚠⚠⚠ AND WITH NO TEST THERE IS NO ROUTE TO ONE AT ALL — a certificate is a
      `Certification` row written on a pass, so **no test, no certificate.**
      Measured: 15 of 23 paths, and 0 `issued_from: "LEARN"` rows ever.
    */
    {
      label: "Certificate",
      done: p.certificateEarned,
      href: p.certificateEarned ? p.certificateUrl : null,
      /* ⚠ THE REASON SAYS WHY IT IS UNAVAILABLE, NOT HOW IT IS NORMALLY
         EARNED. *"Earned by passing the path test"* was the first draft and it
         is a definition, not a reason — it leaves the member to work out that
         there is no test. ⚠⚠ Each node carries ITS OWN reason even though the
         node beside it says something similar: a control says what it governs
         at the point it governs it (the counting rules, rule 3). */
      ...(p.testExists ? {} : { unavailable: "No test on this path, so none to earn." }),
    },
  ];
}

/**
 * ── ⚠⚠⚠ WHICH STAGE THE MEMBER IS STANDING ON. EXPORTED, AND HERE IS WHY ──
 *
 * ⚠⚠ **THIS RULE USED TO LIVE INSIDE THE COMPONENT, AND `check:learn-views`
 * COULD NOT SEE IT.** The gate had its own copy of the same expression, so
 * mutating the component left the gate GREEN — ⚠⚠⚠ **an assertion its own
 * mutation cannot fail is not an assertion (`E607`), and mine was testing the
 * test.** Caught by running the mutation and reading the result rather than
 * assuming the red.
 * ⚠ Moving it here fixes both halves at once: one definition (`E585`) and a rule
 * the gate can actually reach.
 *
 * ⚠⚠ **THE FIRST STAGE THAT IS NEITHER DONE NOR UNAVAILABLE.** `-1` when there
 * is no such stage, which is the truth both when every stage is finished AND
 * when the ones that remain cannot be reached on this path.
 */
export function currentStageIndex(stages: Stage[]): number {
  return stages.findIndex((s) => !s.done && !s.unavailable);
}

export function PathStages({ path }: { path: AppPathView }) {
  const stages = pathStages({
    slug: path.slug,
    enrolled: path.enrolled,
    percent: path.percent,
    testExists: path.test.exists,
    testReady: path.test.ready,
    testPassed: path.test.passed,
    certificateEarned: path.certificate.earned,
    certificateUrl: path.certificate.verifyUrl,
  });

  /*
    ⚠⚠⚠ **WITHOUT THE `unavailable` CLAUSE, FINISHING THE COURSES ON A
    TEST-LESS PATH WOULD LIGHT `Path Test` AS *"you are here"*** — pointing a
    member at a stage that does not exist, which is the defect this whole change
    is fixing rather than a smaller cousin of it.
    ⚠ The rule itself lives in `currentStageIndex` above, exported so the gate
    can mutate it — see that docblock for what went wrong when it did not.
  */
  const currentIndex = currentStageIndex(stages);

  return (
    /*
      ── ⚠⚠⚠ IT WRAPS. IT DOES NOT SCROLL, AND THAT IS `E609`'s RULING ───────

      ⚠ MEASURED AT 390px ON THE FIRST BUILD: the four stages need **531px in a
      348px row**, and the scroller's edge sliced `Path Test` through the middle
      of the word. ⚠⚠ **`E609` ALREADY RULED ON EXACTLY THIS**, on the Settings
      row that cut *"Profile Setti…"* in half: **a word cut mid-stroke with no
      affordance reads as BROKEN, not as scrollable** — nothing tells the member
      to swipe. ⚠⚠⚠ **AND A STAGE RAIL IS THE WORST PLACE FOR IT:** a member who
      cannot see `Certificate` cannot see what the path is FOR.
      ⚠ `PageTabs` keeps its scroller because its rows are long and homogeneous;
      four stages wrap to two clean rows. ⚠⚠ The connector that begins a wrapped
      row is kept deliberately — it reads as *"continues from above"*, which is
      what it is.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   className="… flex items-center gap-0.5 overflow-x-auto rounded-brand …"
    */
    <nav
      aria-label="Your progress through this path"
      className="mb-5 flex flex-wrap items-center gap-x-0.5 gap-y-1 rounded-brand border border-line bg-white px-3 py-1.5"
    >
      {stages.map((s, i) => {
        const state: StepState = s.unavailable
          ? "unavailable"
          : i === currentIndex
            ? "current"
            : s.done
              ? "done"
              : "upcoming";
        /*
          ⚠⚠ THE LABEL CARRIES THE STATE FOR A SCREEN READER, because the disc is
          `aria-hidden` and colour is not announced. ⚠ Without this the rail is
          four words in a row to anybody not looking at it.
          ⚠⚠⚠ AND AN UNAVAILABLE STAGE SPEAKS ITS REASON, not just its state —
          the reason is rendered as small print beside the label, and small print
          is exactly what a screen reader user would otherwise never be told.
        */
        const spoken = s.unavailable
          ? `${s.label} — not available on this path. ${s.unavailable}`
          : `${s.label} — ${
              state === "done" ? "done" : state === "current" ? "you are here" : "not yet"
            }`;
        const inner = (
          <>
            <StepDisc n={i + 1} state={state} />
            <span
              className={
                "whitespace-nowrap text-[13px] font-semibold " +
                (state === "current"
                  ? "text-magenta"
                  : state === "done"
                    ? "text-ink"
                    : "text-ink-2")
              }
            >
              {s.label}
              {/*
                ── ⚠⚠⚠ THE REASON RENDERS. THAT IS THE WHOLE POINT. ───────────

                ⚠ Scott: *"Certificate renders unavailable, unlinked, WITH ITS
                REASON."* ⚠⚠ A greyed node with no explanation is the same door
                onto a wall as a live one — **the member still cannot tell
                whether they have not got there yet or it does not exist.**
                ⚠⚠⚠ **IT IS THE SAME CONTRACT `PatternHeader` ENFORCES:** a dash
                carries its reason, and a reason-less dash is unrepresentable in
                the type. ⚠ Small print, one line, neutral — no apology, no
                promise, no date (ruling 18).
              */}
              {s.unavailable && (
                <span className="mt-0.5 block whitespace-normal text-[11px] font-normal leading-snug text-ink-2">
                  {s.unavailable}
                </span>
              )}
            </span>
            <span className="sr-only">{spoken}</span>
          </>
        );

        return (
          <div key={s.label} className="flex shrink-0 items-center">
            {i > 0 && <StepConnector />}
            {/*
              ⚠⚠⚠ A LINK ONLY WHERE THERE IS SOMEWHERE TO GO. The `<span>` branch
              is NOT a disabled control — it carries no hover, no cursor and no
              aria-disabled, because it is text about where the member is, and a
              greyed button is the door onto a wall this avoids.
            */}
            {s.href ? (
              <Link
                href={s.href}
                aria-current={state === "current" ? "step" : undefined}
                className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-[9px] px-2.5 transition-colors hover:bg-ink/5"
              >
                {inner}
              </Link>
            ) : (
              <span
                aria-current={state === "current" ? "step" : undefined}
                className="flex min-h-[44px] shrink-0 items-center gap-2 px-2.5"
              >
                {inner}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
