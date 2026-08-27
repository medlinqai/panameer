/**
 * `/learn`'s FIVE STEPS — THE LABELS, AND ONLY THE LABELS (`P1-J0-E281`).
 *
 * ── ⚠ WHY THE STRINGS LIVE HERE AND NOT IN THE COMPONENT ────────────────────
 *
 * Exactly the reason `spine-steps.ts` gives for `summaryFor`: `check:ui` can
 * assert the rendered summaries against their SOURCE without importing React. A
 * guard that compares the page to a literal it typed itself proves only that
 * somebody typed the same thing twice.
 *
 * ⚠ THE PANELS ARE NOT HERE. They are React and they stay in `LearnPublic.tsx`,
 * keyed by `n`. This file must remain importable from a Playwright spec.
 *
 * ── ⚠ THESE FIVE ARE SCOTT'S, 2026-08-22, WITH ONE CASING FIX ───────────────
 *
 * He typed `Watch Each course` and `Connect to the instructor`; Title Case is
 * `conventions.md` and his standing instruction, recorded here so it does not
 * read as a rewrite.
 *
 * ⚠ STEP 2 IS `Meet Your Instructor`, NOT `Connect to the Instructor`, AND THAT
 * IS A PRODUCT-TRUTH DECISION, NOT A PREFERENCE. There is still no
 * `Conversation`, `Message` or `Thread` model in the schema, and `/messages`
 * ships a `disabled` composer reading *"Messaging isn't available yet"*. `Meet`
 * is what the product does today: teaching is recorded PER LESSON, most lessons
 * carry an `expert_person_id`, and real photos ship.
 *
 * ⚠⚠ THE LABEL BECOMES `Connect with Your Instructor` THE DAY CONNECTIONS SHIP.
 * One string, this one. `2. Claude Sub-Files/instructor_connections_spec.md` is
 * the spec. Do not build any of it from here.
 *
 * ⚠ STEP 5 IS AN INSTRUCTION THE LEARNER PERFORMS, NOT AN INTEGRATION. Panameer
 * posts nothing to LinkedIn; `deployment.md` records that LinkedIn's partner
 * programs are approval-gated. The copy must never imply otherwise.
 */

export type LearnStepLabel = {
  /** The drawn numeral, 1-based. */
  n: number;
  /** The always-visible disclosure row label. */
  summary: string;
};

export const LEARN_STEPS: LearnStepLabel[] = [
  { n: 1, summary: "Enroll in a Learning Path" },
  /*
    ⚠⚠ THIS REVERSES `Meet Your Instructor`, WHICH SCOTT SETTLED THE SAME MORNING,
    AND IT SHIPS BECAUSE THEY ARE BOTH HIS WORDS (`P1-J0-E296`, 2026-08-24).

    ⚠ NOTHING IN THE BUILD CHANGED IN BETWEEN. There is still no `Conversation`,
    `Message` or `Thread` model in the schema, and `/messages` still ships a
    `disabled` composer reading "Messaging isn't available yet" (`P1-J3-E014`).
    `Meet` was chosen that morning FOR THAT REASON — it named what the product
    does today, which is put the recording instructor's name and photo on every
    lesson.

    ⚠ HE ALSO DECIDED ON 2026-08-24 THAT CONNECTION SHOULD BE FREE AND OPEN
    (`connection_model_decision.md`) — which makes this label eventually true and
    NOT true now. A decision to allow connection is not a connection feature.

    ⚠ AND THE PAGE NOW MAKES THE CLAIM TWICE: the hero sub-copy says `connect with
    instructors` (`P1-J0-E290`). Both flagged, neither harmonised. Scott decides.

    ⚠ THE WORD IS AUTHORISED; THE VERB IS NOT. Do not read this label as licence to
    build messaging, connections, referrals or invites.
  */
  { n: 2, summary: "Connect with the Instructor" },
  /* ⚠ ONE ROW CARRIES TWO SECTIONS. `E283`: merging course and lesson collapses a
     level this page was built to teach. Deliberate, and the two blocks stay
     visibly separate INSIDE the panel so the hierarchy is still shown. */
  { n: 3, summary: "Watch the Courses and Lessons" },
  /* ⚠ THE EXCLAMATION MARK IS SCOTT'S AND IT IS THE ONLY ONE ON THE PAGE. It was
     already recorded as deliberate on the old step 4 and it survives `E296`. */
  { n: 4, summary: "Get Certified!" },
  /*
    ⚠⚠ THE PANEL UNDER THIS NO LONGER MATCHES THE LABEL, AND IT IS NOT FIXED HERE.

    `Tell Your Peers` is ADVOCACY. The panel is the old `What Do You Do After the
    Training` — *"Your certificate publishes to your profile, with a link you can
    put anywhere"* — which is about a CREDENTIAL, not about telling anyone. The
    previous label (`Add Certification to LinkedIn and Resume`) described the panel
    exactly; this one does not.

    ⚠ REPORTED, NOT RE-AUTHORED. `P1-J0-E296` says Scott decides whether the panel
    follows the label or the label returns.

    ⚠ AND NOTHING HERE MAY IMPLY PANAMEER TELLS ANYONE. `deployment.md`: LinkedIn's
    partner programs are approval-gated. There is no referral, share or invite
    feature anywhere in the schema — do not build one to justify the label.
  */
  {
    n: 5,
    /*
      ⚠⚠ `Get Expert Support` SUPERSEDES `Tell Your Peers` (`P1-J0-E322`), AND IT
      SUPERSEDES TWO ROWS THAT RECORDED THAT LABEL AS SETTLED — `P1-J0-E296` and
      `P1-J0-E310`. Do not restore it citing either.

      Scott, 2026-08-24: *"The tell your peers could be swapped out for 'Get Expert
      Support'. This is the 'keeps you working' idea."* It is also the beat the hero
      now ends on — `get the support you need to stay working` (`E321`) — so the
      headline and the spine agree for the first time.

      ⚠ STEP 5's PANEL CONTENT CHANGED WITH IT, and step 5's OLD content (the
      certificate publishing to your profile) folded UP into step 4 where it belongs.
      See `LearnPublic.tsx`'s notes on both panels.

      ⚠ REMOVING THE OLD LABEL REMOVES THE ONLY THING ON THE PAGE THAT IMPLIED A
      REFERRAL FEATURE. None exists and none is being built.
    */
    summary: "Get Expert Support",
  },
];

/*
  ⚠ NO TERMINAL PERIODS ON 1, 2, 3 OR 5, AND THAT IS A READING OF WHAT SCOTT TYPED
  RATHER THAN A CORRECTION OF IT. He wrote periods after 1-3, `!` after 4 and
  nothing after 5 — inconsistent as punctuation, which is what tells you it was
  PROSE punctuation in a sentence he was typing, not LABEL punctuation. Every
  other label on the site is unpunctuated (`conventions.md`). ⚠ `Get Certified!`
  KEEPS ITS EXCLAMATION because it is not sentence punctuation — it is emphasis,
  it is already recorded as deliberate, and it is the only one on the page.
*/

/** ⚠ THE SECTION HEADING ABOVE THE ROWS, NOT A ROW — same as `/optimize` (`E281`). */
export const LEARN_SPINE_HEADING = "Here’s How It Works";

/*
  ⚠⚠ `/learn`'s CTA LABEL, DEFINED ONCE (`P1-J3-E038`). Scott, 2026-08-26:
  *"the button is the LEARN CTA."*

  ⚠ THE STRING DID NOT CHANGE — byte-identical to what `E037` shipped. This closes
  a debt, it does not restyle a button.

  ── ⚠⚠ WHY, AND IT IS NOT HYPOTHETICAL ──────────────────────────────────────

  `E037` shipped Scott's hero sentence, which QUOTES the button. That brief was
  explicitly one string and forbade creating a constant, so the label ended up typed
  in THREE places — the button, the sentence, and the `check:ui` assertion. ⚠ THE
  SPEC IS THE ONE PEOPLE FORGET, and it is why this drifts anyway once the first two
  are fixed.

  ⚠⚠ `/work` ALREADY SHIPPED THIS DEFECT FOR REAL (`P1-J4-E024`): its button said
  `Create a Work Request` while its own sub-copy quoted `Create Work Request`. Two
  live strings, on one screen, caught only when Scott read them side by side.

  ⚠ THIRD PAGE, ONE CONVENTION — the exact shape of `TALENT_CTA_LABEL`
  (`talent-steps.ts`) and `WORK_CTA_LABEL` (`work-steps.ts`). ⚠ DO NOT INVENT A
  FOURTH PATTERN, and do not add a `lib/` file: this file already holds this page's
  strings, which is the same reason the other two live where they do.

  ⚠ CONSUMERS — three, and the literal now exists NOWHERE else:
    `LearnPublic.tsx` the hero button
    `LearnPublic.tsx` the label quoted inside Scott's sentence
    `e2e/marketing-home.spec.ts` the accessible-name assertion
  ⚠ IF THE LABEL CHANGES, IT CHANGES HERE AND ALL THREE FOLLOW.
*/
export const LEARN_CTA_LABEL = "Start Learning for Free";

/**
 * ⚠⚠ THE TAGLINE SHIPS AS ONE SENTENCE. SCOTT WROTE TWO, AND THE SECOND IS HELD.
 *
 * His string was: *"From Account Creation to Free Training in under 3 minutes.
 * Get certified for most learning paths, for free."*
 *
 * ⚠ `most` DID NOT SURVIVE A LIVE DB READ, which the brief required before the
 * word shipped. Measured 2026-08-21 against the live database:
 *
 *     LearningPath total                                23
 *     could carry a test (>= 2 lessons)              17/23  (74%)
 *     hold a LearnAssessment row at all                8/23  (35%)
 *     PUBLISHABLE (>= 5 valid questions)               7/23  (30%)
 *     PUBLISHED (a learner can sit it today)           0/23  (0%)
 *
 * `most` is true only of "could EVENTUALLY carry a test". On the reading a
 * visitor actually takes — *can I get certified in most paths* — it is 0%.
 *
 * ⚠ HELD BACK, NOT DROPPED, AND NOT SOFTENED. The brief forbids weakening it to
 * something vaguer, and this file already has the precedent: `P1-J3-E011`'s
 * *"Message your instructor from within the course"* is absent from the hero for
 * the same reason. The clause goes in unchanged the day the ratio is a majority.
 *
 * ⚠ ALSO GONE FROM SCOTT'S ORIGINAL: `within 24 hours`. `b5f3923` added a HUMAN
 * review gate, so a pass does not issue a credential until a person reviews it —
 * and there is no queue, no timer and no alert behind that number. It returns the
 * day a queue exists.
 */
/**
 * ⚠⚠ THE BLOCK'S HEADLINE — PROMOTED FROM SUB-COPY BY `P1-J0-E304`, AND IT NOW
 * CARRIES THREE PROBLEMS THAT ARE REPORTED, NOT FIXED.
 *
 * Scott, 2026-08-24: *"Here is what the text should say — 'From courses to
 * certification in hours, with the support of the community forever.'"*
 *
 * ⚠ IT IS THE BIGGEST TEXT IN THE BLOCK NOW. `E304` swapped the two strings' roles:
 * `Here's How It Works` became a small magenta eyebrow and this became the display
 * headline. So each flag below matters MORE than it did as grey sub-copy.
 *
 * ── 1. ⚠⚠ `certification in hours` IS THE SLA HE DELETED THIS MORNING, TIGHTER ──
 *
 * He removed `within 24 hours` from THIS EXACT TAGLINE on 2026-08-24, because
 * `b5f3923` added a HUMAN REVIEW GATE: a pass does not issue a credential until a
 * person reviews it, and there is no queue, no timer and no alert behind it.
 * `in hours` is a TIGHTER promise than the one he just pulled, on the same line, the
 * same day. ⚠ AND `P1-J3-E030`: 0 OF 23 PATHS HAVE A PUBLISHED TEST — nobody can be
 * certified in hours, in days, or at all, today.
 *
 * ── 2. ⚠ `forever` IS A PERPETUITY CLAIM ────────────────────────────────────
 *
 * Counsel-gate class, the same family as the retired `only` and `endless`. What the
 * community actually is, measured 2026-08-24: `ForumThread`/`ForumPost` exist in the
 * schema, and NOTHING ON `/learn` LINKS TO A FORUM — there is no reachable community
 * surface from this page at all. `E306`'s free tier (`Ask the group`) describes it as
 * a thing that will exist. So the page promises forever access to something a visitor
 * cannot reach today. ⚠ NOT SOFTENED — reported.
 *
 * ── 3. ⚠⚠ `free` DROPS TO ONE MENTION AND THE TIME CLAIM DIES ENTIRELY ──────
 *
 * The string this replaced was *"From Account Creation to Free Training in under 3
 * minutes."* — it carried BOTH. `E302` separately replaced the hero's second sentence
 * (which carried the only other `under 3 minutes`) with `Check out the steps below to
 * see how it works.` ⚠ SO AFTER `E302` AND `E304` TOGETHER, `under 3 minutes` APPEARS
 * NOWHERE ON `/learn`. `...all for free` survives in the hero's first sentence, so
 * `free` survives exactly once.
 *
 * ⚠ SCOTT ASKED FOR BOTH TO BE STRESSED EARLIER THE SAME DAY (`P1-J0-E295`). He may
 * not intend the loss. REPORTED — and DO NOT RE-ADD EITHER.
 *
 * ── WHAT IS NO LONGER HERE ─────────────────────────────────────────────────
 *
 * ⚠ THE `_LEAD`/`_STRESS` SPLIT IS GONE. It existed so a `#efa3ee` span could stress
 * half the line; `E302` removed the pink from this page entirely, so the split has no
 * job and a two-constant tagline would just invite the span back.
 *
 * ⚠ THE HELD-BACK `most learning paths` CLAUSE IS STILL HELD, and now moot for a
 * different reason — Scott replaced the whole sentence. The measurement that held it
 * stands: 7 of 23 paths hold a publishable question set, 0 are published.
 */
export const LEARN_SPINE_TAGLINE =
  "From courses to certification in hours, with the support of the community forever.";
