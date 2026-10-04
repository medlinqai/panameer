import Link from "next/link";
import { StepDisc, StepConnector, type StepState } from "@/components/casing/StepDisc";
import type { AppPathView } from "@/lib/learn-path-app";

type Stage = {
  label: string;
  done: boolean;
  href: string | null;
  unavailable?: string;
};

export function pathStages(p: {
  slug: string;
  enrolled: boolean;
  percent: number;
  testExists: boolean;
  testReady: boolean;
  testPassed: boolean;
  certificateEarned: boolean;
  certificateUrl: string | null;
}): Stage[] {
  return [
    { label: "Enrolled", done: p.enrolled, href: null },
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
