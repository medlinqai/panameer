/**
 * `/`'s FOUR-AUDIENCE SECTION — WHO LEARN IS SOLD TO (`P1-J0-E311`).
 *
 * Scott, 2026-08-24: *"For the pieces of LEARN that need to be sold on the HOME
 * page...I think there are 4 parties to market to."* And the split, his:
 * *"3 can SAVE money, one can MAKE money."*
 *
 * ⚠ A SECTION, NOT AN IMAGE. He said *"build an image or a section"*; a
 * four-audience matrix in art goes stale, cannot be edited by him, and
 * `P1-J0-E284` is what that costs. Every string below is a string he can change
 * in one message.
 *
 * ── ⚠⚠ ONLY ROW 4's SENTENCE IS SCOTT'S. THE OTHER THREE ARE CC's ───────────
 *
 * He named the four parties and the outcome (`SAVE`/`MAKE`) but NOT the mechanism
 * for the first three. Those three sentences are drafted from what is
 * demonstrably true — free training on the process they already operate — and are
 * marked `⚠ DRAFT — CC's words, not Scott's` at their sites below. ⚠ NO SAVINGS
 * FIGURE IS INVENTED FOR ANY OF THEM; there are no numbers in this section at all.
 *
 * ── ⚠⚠ THE LABELS ARE NOT HIS EITHER, AND THAT WAS MANDATORY ────────────────
 *
 * `positioning_decision.md`'s SELF-IDENTIFICATION TEST (2026-08-24) fails two of
 * his four party names outright and flags a third, with the instruction *"FIX
 * BEFORE THE HOME SECTION IS BUILT"* attached to this very row:
 *
 *     `external contacts (e.g. supplier)`  ❌  "`supplier` passes; `external
 *                                              contact` is CRM jargon"
 *     `end-users (e.g. requesters)`        ❌  "that is Panameer's word. She calls
 *                                              herself *the person who raises the PO*"
 *     `provider students`                  ⚠   "nobody here calls themselves a student"
 *     `provider experts`                   ✅  "close enough — *I'm a consultant*"
 *
 * ⚠ THE TAXONOMY IS RIGHT AND UNTOUCHED — four parties, three SAVE, one MAKE. Only
 * the WORDS changed, and two of the replacements are the test's own phrasing.
 * Row 4 keeps Scott's own noun (`Expert providers`) because it passes.
 *
 * ⚠ ROWS 3 AND 4 ARE BOTH CONSULTANTS, WHICH IS THE TRUTH OF THIS MARKET rather
 * than a collision: the same person is on the SAVE side while learning a module
 * and on the MAKE side once they teach it. That is why the split is by what they
 * do here, not by who they are.
 *
 * ── ⚠⚠ THE RETAINER IS THE ONE THING THAT COULD NOT SHIP ───────────────────
 *
 * Scott: *"Once a student connects with the instructor...they should be marketing
 * a retainer 1-2 hours a month."* ⚠ THAT IS AN INSTRUCTION TO THE INSTRUCTOR, NOT
 * A PLATFORM FEATURE, AND NONE OF IT IS BUILT. Verified 2026-08-24 against the
 * schema: ZERO `Conversation` and ZERO `Message` models, no booking, no
 * scheduling, no retainer product — `messaging_model_spec.md` is entirely design —
 * and `/messages` still ships a VISIBLY DISABLED composer (`P1-J3-E014`).
 *
 * ⚠ SO `1-2 hours a month`, any retainer price, and any wording implying the
 * platform sells, schedules or bills a retainer ARE ABSENT. His brand-and-income
 * sentence ships in full; the limit is stated in `aud-note` beneath it rather than
 * left for a reader to discover.
 *
 * ── ⚠ WHAT IS BACKED, READ LIVE 2026-08-24 ─────────────────────────────────
 *
 * `LearningPath` — 23 rows, ALL 23 `PUBLISHED`; 54 `Course`; 522 `Lesson`.
 * `/api/learn/enrol` gates on a SESSION ONLY — no role check, no `USER_CLASS`, no
 * provider requirement — so a supplier, a requisitioner and a consultant can all
 * genuinely enrol. That is what makes rows 1-3 true rather than aspirational.
 *
 * ⚠ AND WHAT IS NOT: 8 `LearnAssessment` rows, ALL `DRAFT` — so 0 of 23 paths
 * have a sittable test (`P1-J3-E030`) and NO CERTIFICATE CAN BE EARNED TODAY. ⚠ NO
 * ROW BELOW MENTIONS A CERTIFICATE. Do not add one until a test can be sat.
 *
 * ── ⚠ NO CTA, DELIBERATELY ─────────────────────────────────────────────────
 *
 * `/learn`'s two hero buttons are `Create Your Free Account` and `Browse the
 * Catalog`, and Scott kept both explicitly (`P1-J0-E291`). ⚠ THE SECOND IS A LIVE
 * DEAD END — `P1-J0-E316`, `learn/courses/page.tsx` is literally `<ComingSoon />`
 * — so it must not be propagated here. Writing a third label would be CC putting
 * copy on the home page. `Learn` is a top-level nav item and reaches the pillar
 * page. ⚠ REPORTED AS A GAP; the button belongs to the Learn pillar row when
 * treatment `B` lands (`P1-J0-E297`), which is where its `go` link lives.
 *
 * ── ⚠⚠ IT STANDS ALONE TODAY AND THAT IS A COUPLING TO WATCH ───────────────
 *
 * `P1-J0-E297` selects treatment `B` for six pillar rows: eyebrow, headline, one
 * sentence, small graphic. NONE OF THEM EXIST YET, so this is the only Learn
 * content on `/`. It is self-contained — its own eyebrow says which pillar it
 * belongs to — but when the Learn pillar row arrives it will carry a CONDENSED
 * value summary of Learn, and this section is a second Learn value argument on the
 * same page. ⚠ THAT IS `E162`/`E242`'s SHAPE — one pillar, two value stories —
 * which `E297` names as the thing to avoid. The two must be designed together: the
 * row becomes this section's header, or this section becomes the row's expansion.
 * ⚠ REPORTED, NOT DECIDED HERE.
 *
 * ⚠ NO CLIENT BOUNDARY. `/` must still prerender `○`; this is a plain server
 * component with no state and no handlers.
 */

type Audience = {
  /**
   * ⚠ WHAT THIS PERSON CALLS THEMSELVES, not what the database calls them — see
   * the self-identification test in the header. `⚠ DRAFT` on rows 1-3.
   */
  who: string;
  /** ⚠ `save` on three, `make` on exactly one. Asserted by `check:ui`. */
  side: "save" | "make";
  value: string;
};

/**
 * ⚠ THREE ROWS, THREE DRAFT SENTENCES. Every one is a claim about FREE TRAINING ON
 * A PROCESS THE READER ALREADY OPERATES, because that is the only Learn mechanism
 * that is unconditionally true today (23 published paths, no role gate on
 * enrolment, nothing to pay). ⚠ NO FIGURES, NO CERTIFICATE, NO TIMEFRAME.
 */
const SAVE_SIDE: Audience[] = [
  {
    /*
      ⚠ DRAFT — CC's words, not Scott's.

      ⚠ THE LABEL IS THE TEST'S OWN VERDICT: his `external contacts (e.g. supplier)`
      fails, and the reason given is that *"`supplier` passes; `external contact` is
      CRM jargon."* So the row is addressed to the supplier in the supplier's word.
    */
    who: "Suppliers",
    side: "save",
    value:
      "A supplier can take the same training your own team takes, free, so they transact the way your process expects instead of the way they guessed.",
  },
  {
    /*
      ⚠ DRAFT — CC's words, not Scott's.

      ⚠ THE LABEL IS ALSO THE TEST'S OWN PHRASING. `end-users (e.g. requesters)` is
      marked *"Panameer's word. She calls herself the person who raises the PO."*
      That sentence is the label.
    */
    who: "The people who raise the POs",
    side: "save",
    value:
      "Whoever raises the requisition can learn the system they raise it in, free, instead of learning it by interrupting the one person who already knows.",
  },
  {
    /*
      ⚠ DRAFT — CC's words, not Scott's.

      ⚠ `provider students` IS FLAGGED — *"nobody here calls themselves a student."*
      They call themselves a consultant, which is also what row 4 calls itself; the
      difference is what they are doing here, and the label says so.

      ⚠ NO CERTIFICATE CLAIM. 8 `LearnAssessment` rows, all `DRAFT` — 0 of 23 paths
      can be tested, so nothing can be certified today (`P1-J3-E030`).
    */
    who: "Consultants adding a module",
    side: "save",
    value:
      "A consultant can add a module to what they already sell without paying for a course — every path, every lesson, free.",
  },
];

/**
 * ⚠⚠ ROW 4 IS SCOTT'S OWN SENTENCE, VERBATIM, AND THE ONLY COPY IN THIS FILE THAT
 * IS NOT CC's:
 *
 *   *"Expert providers can build their brand training Oracle Cloud project teams
 *   and learners, as well as build their income by mentoring students in
 *   one-on-one sessions."*
 *
 * ⚠ SHIPPED WHOLE. It claims what the EXPERT does, not what the platform does, so
 * it survives the tense rule that killed the retainer line. ⚠ THE LIMIT IS SAID
 * OUT LOUD IN `aud-note` instead — see the header.
 *
 * ⚠ `Expert providers` IS HIS NOUN AND IT PASSES THE SELF-IDENTIFICATION TEST, so
 * unlike rows 1-3 the label was not changed.
 */
const MAKE_SIDE: Audience = {
  who: "Expert providers",
  side: "make",
  value:
    "Expert providers can build their brand training Oracle Cloud project teams and learners, as well as build their income by mentoring students in one-on-one sessions.",
};

export function FourAudiences() {
  return (
    <section className="sd">
      <div className="wrap">
        {/*
          ⚠ THE EYEBROW IS THE PILLAR NAME, NOT A SLOGAN — `Learn`, matching
          treatment `B`'s eyebrow in `mockups/pillar_band_three_ways_2026-08-21.html`
          so this section and the pillar row that will sit above it read as one
          thing rather than two. A pillar name is a fact; it is not copy CC wrote.
        */}
        <p className="eyebrow">Learn</p>
        {/*
          ⚠⚠ THE HEADLINE IS SCOTT'S SENTENCE, WITH TWO NORMALISATIONS, BOTH
          REPORTED RATHER THAN DONE QUIETLY. He wrote *"3 can SAVE money, one can
          MAKE money."*

            · `3` -> `Three` — a numeral opening a display headline reads as a
              count of something on the page, and there is no list of 3 above it.
            · the comma becomes a full stop — two independent clauses, and the
              contrast is the whole idea, so they get equal weight.

          ⚠ HIS CAPITALISED `SAVE`/`MAKE` IS NOT REPRODUCED AS SHOUTING. The
          emphasis moves to the chips on the rows, where it labels something,
          rather than staying in the headline where it would just be loud. ⚠ IF HE
          WANTS THE CAPS, THEY GO BACK — reported.

          ⚠ NOTHING ELSE IN THIS SECTION IS A HEADLINE CC WROTE, which is the rule
          `/find-work`'s spine follows too: a drafted line must never be the
          largest text on the page.
        */}
        <h2>
          Three can <b>save</b> money. One can <b>make</b> money.
        </h2>

        {/*
          ⚠ A DEFINITION LIST, because that is what this is — a party and what
          Learn is worth to them. Not a table: there is no second axis, and the
          SAVE/MAKE column is carried by the shape and the chip.
        */}
        <dl className="aud-grid">
          {SAVE_SIDE.map((a) => (
            <div className="aud-row" data-aud-side={a.side} key={a.who}>
              <span className="aud-chip">Saves</span>
              <dt className="aud-who">{a.who}</dt>
              <dd className="aud-val">{a.value}</dd>
            </div>
          ))}
        </dl>

        {/*
          ⚠⚠ THE FOURTH PARTY IS OUTSIDE THE GRID ON PURPOSE. Scott's whole idea is
          three and then one that is different; four cells of one grid would say
          "four audiences" and lose it. ⚠ DO NOT MOVE THIS INTO `.aud-grid` TO
          TIDY THE MARKUP.
        */}
        <dl className="aud-make">
          {/* ⚠ THE `<div>` IS NOT DECORATION — a `<dl>`'s direct children may only
              be `dt`, `dd` or `div`, and the chip is a `span`. `.aud-row` above has
              the same wrapper for the same reason, which is also the shape
              `OneWayTwoWay`'s `.owtw-row` uses. */}
          <div data-aud-side={MAKE_SIDE.side}>
            <span className="aud-chip">Makes</span>
            <dt className="aud-who">{MAKE_SIDE.who}</dt>
            <dd className="aud-val">{MAKE_SIDE.value}</dd>
          </div>
        </dl>

        {/*
          ⚠⚠ THE LIMIT, AND IT IS LOAD-BEARING FOR ROW 4. `mentoring students in
          one-on-one sessions` is Scott's phrase and it ships — but there is NO
          `Conversation` model, NO `Message` model, no booking and no scheduling in
          this codebase, and `/messages` renders a disabled composer
          (`P1-J3-E014`). Without this line the section would imply the platform
          arranges and bills mentoring today. ⚠ DRAFT — CC's words, not Scott's.
          ⚠ DO NOT DELETE IT TO TIGHTEN THE SECTION.
        */}
        <p className="aud-note">
          Training and enrolment are live and free today. One-to-one mentoring
          is arranged between the two people — Panameer does not schedule or
          bill it yet.
        </p>
      </div>
    </section>
  );
}
