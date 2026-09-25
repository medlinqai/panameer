/**
 * ── ⚠⚠⚠ THE STAGED-SEQUENCE VOCABULARY, EXTRACTED (brief 9 WS-C item 1) ──
 *
 * ⚠⚠ **THE NUMBERED DISC AND THE CONNECTOR ARE THIS APPLICATION'S ONE VISUAL
 * LANGUAGE FOR A SEQUENCE WITH A DONE STATE.** They were written inline inside
 * `PageTabs`, which means they were unavailable to the next surface that needed
 * them — `E585` in the same shape as `LearnTabs` and the pattern header, and the
 * third time in this one run.
 *
 * ── ⚠⚠⚠ THE PREMISE THIS CORRECTS, AND IT IS RULING 53a ─────────────────
 *
 * ⚠ WS-C item 1 says: *"Use the same stage vocabulary and visual language a WORK
 * record uses — report what exists there and reuse it; do not invent a second
 * stage component."* ⚠⚠ **RULING 53a: "X already exists, reuse it" must NAME THE
 * FILE X LIVES IN AND CONFIRM X IS IMPORTABLE.** So it was measured before a line
 * was written, and the premise is **half true in a way that matters**:
 *
 *   ⚠ `src/lib/sourcing-stage.ts` — the WORK record's stage VOCABULARY. It
 *     exists and it is importable.
 *   ⚠⚠⚠ **BUT IT IS IMPORTED BY EXACTLY TWO FILES, AND BOTH ARE GATES** —
 *     `scripts/check-hire.ts` and `scripts/check-sourcing.ts`. **ZERO
 *     components. ZERO pages.** So **NO WORK RECORD DRAWS A STAGE RAIL
 *     ANYWHERE.** There was no visual language to reuse and no second component
 *     to avoid inventing — the thing the brief pointed at is a derivation with
 *     no renderer.
 *   ⚠⚠ **AND ITS WORDS WOULD HAVE BEEN WRONG ANYWAY.** `SOURCING_STAGES` is
 *     `INVITED · BID · TESTED · INTERVIEWED · SHORTLISTED · ASSIGNED · DECLINED`
 *     — **one provider's position in a BUYER's sourcing process.** A path rail
 *     is the LEARNER'S OWN progress. Different subject, different axis; putting
 *     those seven words on a learning path would say something false.
 *   ⚠ It also imports `prisma` on line 1, so a client component cannot touch it
 *     — the trap that broke the build at `E628`.
 *
 * ⚠⚠⚠ **WHAT DOES EXIST IS `PageTabs`' `process` MODE, AND THE BRIEF DID NOT
 * NAME IT:** *"numbers + connectors + done/current/upcoming"*. ⚠ And `nav.ts`
 * says of it, in its own words: *"`process` SHIPS WITH NO CONSUMER TODAY…
 * the first set that genuinely has a required order can declare it in one
 * line."* ⚠⚠ **A BUILT, ASSERTED, UNUSED PATTERN IS EXACTLY WHAT "the whole app
 * speaks one pattern" ASKS FOR** — so the rail is built on this and not beside
 * it.
 *
 * ── ⚠⚠ WHY THE RAIL IS STILL ITS OWN COMPONENT AND NOT A `PageTabs` CALL ──
 *
 * ⚠⚠⚠ **EVERY ITEM IN `PageTabs` IS A `<Link href>`. THE FOUR PATH STAGES ARE
 * NOT FOUR URLs.** `Enrolled` is a STATE with no destination at all, and
 * `Certificate` has one only once it is earned. ⚠ Passing `PageTabs` an invented
 * href for `Enrolled` would be **a door onto a wall** (`E579`) — the precise
 * defect a stage rail exists to avoid. ⚠⚠ So the rail is a different COMPONENT
 * sharing one VOCABULARY, which is what `E585` actually asks for: not one
 * component for every job, but **one definition of each concept.**
 *
 * ── ⚠⚠⚠ NO PADLOCK IS RENDERABLE HERE, BY CONSTRUCTION ──────────────────
 *
 * ⚠ WS-C item 1: *"NO PADLOCK ON `Path Test`."* ⚠⚠ `PageTabs`' own docblock
 * already carried the rule and the reason — *"UPCOMING STEPS STAY CLICKABLE.
 * GREYING IS A STATE, NOT A LOCK… a locked tab would contradict the product"* —
 * and ruling 54 closed the question for good. ⚠⚠⚠ **THIS MODULE OFFERS NO
 * `locked` STATE AND NO DISABLED BRANCH**, so ruling 26a cannot be re-introduced
 * by a caller that forgets it. The same shape as `PatternHeader` refusing to
 * render a second button and refusing a dash with no reason.
 */

/**
 * ── ⚠⚠⚠ FOUR STATES, AND `unavailable` IS NOT A PADLOCK ─────────────────
 *
 * ⚠⚠ **THE DISTINCTION IS THE WHOLE REASON THIS IS SAFE.** A padlock is a claim
 * about **PERMISSION** — *you may not do this yet* — and ruling 26a removed the
 * permission it claimed, with ruling 54 closing it for good. ⚠⚠⚠ `unavailable`
 * is a claim about **THE THING ITSELF** — *this path has no such stage* — which
 * is a fact about the path and says nothing about the member at all.
 *
 * ⚠ **SO IT CANNOT BE USED TO RE-GATE THE TEST.** A path whose question set is
 * merely unpublished is NOT unavailable: the test exists, and only the absence
 * of the row earns the state. ⚠⚠ `check:learn-views` asserts exactly that, so
 * the distinction is held by a gate and not by this paragraph.
 *
 * ⚠⚠ **IT RENDERS A DASH, NOT A NUMBER**, which is deliberate vocabulary: it is
 * the same mark `PatternHeader` uses for an uncountable figure, and it comes
 * with the same obligation — **the caller must supply the reason**, and a
 * reason-less unavailable stage is unrepresentable in `PathStages`' type.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   ⚠⚠ THREE STATES AND NO FOURTH. `upcoming` is not `locked` — see the docblock.
 * //   export type StepState = "current" | "done" | "upcoming";
 */
export type StepState = "current" | "done" | "upcoming" | "unavailable";

/**
 * ⚠ THE DISC. `aria-hidden` because the label beside it carries the meaning and
 * the order; a screen reader announcing *"2"* before every stage name is noise.
 * ⚠⚠ THE TICK IS ONLY EVER REACHABLE FROM `done`.
 */
export function StepDisc({ n, state }: { n: number; state: StepState }) {
  return (
    <span
      aria-hidden
      className={
        "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[12px] font-bold " +
        (state === "current"
          ? "bg-magenta text-white"
          : state === "done"
            ? "bg-emerald-600 text-white"
            : state === "unavailable"
              ? /* ⚠ FLATTER AND QUIETER THAN `upcoming`, because `upcoming` is a
                   promise that you will get there and this is not. */
                "bg-transparent text-ink-2 ring-1 ring-inset ring-line"
              : "bg-ink-2/12 text-ink-2")
      }
    >
      {/* ⚠⚠ A DASH, NOT A NUMBER — a stage that cannot be reached has no
          position in a sequence the member will walk. Same mark, same
          obligation, as `PatternHeader`'s uncountable figure. */}
      {state === "done" ? "✓" : state === "unavailable" ? "—" : n}
    </span>
  );
}

/**
 * ⚠ THE CONNECTOR SITS *BETWEEN* STEPS, so the caller omits it on the first one.
 * ⚠⚠ Decorative and hidden from assistive tech — the numbers already carry the
 * order, and a run of empty spans would otherwise be announced as content.
 */
export function StepConnector() {
  return <span aria-hidden className="h-px w-3 shrink-0 bg-line sm:w-4" />;
}
