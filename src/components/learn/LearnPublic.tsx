import type { ReactNode } from "react";
import Link from "next/link";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { CATALOG_COUNTS } from "@/lib/learn-catalog-counts";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import type { LearnStepLabel } from "@/lib/learn-steps";
import {
  LEARN_STEPS,
  LEARN_SPINE_HEADING,
  LEARN_SPINE_TAGLINE,
} from "@/lib/learn-steps";
/* ⚠ `SixStepShot` IS NO LONGER IMPORTED (`P1-J0-E292`). The file stays on disk,
   unimported — same rule as `E164`/`DashboardShot`. See the how-it-works block. */
import {
  EnrollShot,
  CourseStepsShot,
  PathCertificateShot,
  InstructorsShot,
  ProfileCertificatesShot,
} from "@/components/learn/public/spine-shots";

/**
 * `/learn` FOR A VISITOR WHO IS NOT SIGNED IN — a sales page, not the catalog.
 *
 * ── THE RULE THIS PAGE ESTABLISHES ───────────────────────────────────────────
 *
 * Scott, 2026-08-19: "the public facing pages are sales... pretty much only. They are to get
 * you to create an account."
 *
 * `/` already worked that way — a stack of sections, one per reason to have an account.
 * `/learn` did not: signed out it served the app's own catalog UI, which is the product
 * wearing a marketing page's URL. This makes the two match, and `/find-work`, `/hire-talent`
 * and `/buy-services` are next — which is why the band is `marketing/SellSection`, not five
 * hand-rolled grids.
 *
 * ⚠ NOT A GATE. Learn is free and stays free. The catalog is one click away at
 * `/learn/courses`, which loads signed out and is NOT result-limited (that rule is for talent
 * and jobs). Nothing here hides anything; it puts the reasons in front of it.
 *
 * ⚠ THIS COMPONENT FETCHES NOTHING. `learn/page.tsx` must not call `getLearnHome()` on the
 * signed-out branch — a visitor should not cost a catalog query to be sold to, and the
 * absence of that query is asserted from the server log rather than assumed.
 *
 * ── ⚠ THE PAGE HAS EXACTLY TWO LIVE DESTINATIONS, BOTH IN THE HERO ───────────
 *
 * `Create your free account` and `Browse the catalog`. Sections 3 and 4 describe a per-course
 * room and instructor 1:1 messaging, and NEITHER EXISTS IN THE SCHEMA — `ForumThread` is the
 * community forum, not a room per course, and there is no messaging or paid-review model at
 * all. `HomeFooter`'s standing rule applies to the whole page: a link ships only when its
 * destination exists. So those two sections carry copy and a graphic and nothing to click.
 *
 * The copy is NOT softened to match the schema. Scott approved these five sections knowing
 * the catalog is thin; whether rooms and mentoring ship before or after this page goes live
 * is his call and is recorded as an open decision.
 *
 * ── ⚠ THE PAGE HAS TWO VOICES, AND THEY ARE NOW TWO DIFFERENT SHAPES ─────────
 *
 * THE SPINE TEACHES: this is what a learning path is, this is what a course is, this is where
 * the certificate comes from. `SECTIONS` (the original five) SELLS. That is the same division
 * `/` makes, and it is why the instructional voice belongs above and would have been wrong
 * inside a sell section.
 *
 * ⚠ THE SPINE IS NO LONGER `SellSection` BANDS. It is five `StepDisclosures` rows — the same
 * component `/optimize` renders (`P1-J0-E281`). `SECTIONS` still renders as bands and is
 * byte-identical to what it was.
 *
 * ⚠⚠ THEY MUST NEVER BECOME ONE ARRAY. This used to be an alternation argument: both `.map`s
 * derived `shaded` and `side` from the index, so a section inserted into `SECTIONS` at index 0
 * flipped the shade and graphic side of all five at once. THE SPINE NO LONGER HAS A SHADE OR A
 * SIDE, so that specific hazard is gone from the spine's half — but the hazard inside
 * `SECTIONS` is unchanged, and the two now differ in KIND as well as in voice. Folding a sell
 * section into the spine would make it a numbered step in a five-step sequence; folding a step
 * into `SECTIONS` would silently un-collapse it into a band and shift the alternation.
 *
 * ⚠ `One-on-one` IN `SECTIONS` NOW OVERLAPS ROW 2 (`Meet Your Instructor`) DIRECTLY, and it
 * promises messaging in the present tense where row 2 deliberately does not. REPORTED, NOT
 * FIXED — the sell sections are out of scope and Scott wants them confirmed first.
 */

/* ────────────────────────────────────────────────────────────────────────────
   THE TEACHING SPINE — NOW FIVE DISCLOSURE PANELS (`P1-J0-E281`, `E283`)

   ⚠ IT USED TO BE SEVEN `SellSection` BANDS. Scott, 2026-08-21, with `/optimize`
   open beside this page: *"Optimize looks GREAT! ... this will be the
   model/template for all pages."* The rows are `StepDisclosures`, the SAME
   component `/optimize` renders — one behaviour, one implementation. Learn
   hand-rolling a second accordion would be `E242` and `E264` again.

   ⚠⚠ NOT ONE STRING IN HERE WAS RE-AUTHORED BY THE MIGRATION. Every heading and
   every body paragraph moved VERBATIM, with its comment, from the band it used
   to live in. Nine walk errors live inside these sentences. A container change is
   not a licence to touch their contents.

   ── ⚠ WHAT MOVED WHERE, BECAUSE IT IS NOT ONE-TO-ONE ────────────────────────

     row 1  <- old §3  `Enroll in a Learning Path`
     row 2  <- old §7  `While You Are Learning`      ⚠ NOT RETIRED. See below.
     row 3  <- old §4 AND old §5, MERGED             ⚠ two blocks, not one sentence.
     row 4  <- old §6  `Get Certified!`
     row 5  <- old §8  `What Do You Do After the Training`
     old §2 `Here’s How It Works` is now the SECTION HEADING above the rows.

   ⚠ `While You Are Learning` WAS NOT DROPPED. `E283` flagged it as having no
   destination in Scott's five; it has one, and it is row 2. `InstructorTiers` is
   the ONLY place the three access tiers appear anywhere on the site, so losing it
   would have been a silent deletion.

   ⚠ THE EYEBROWS ARE GONE FROM THE PANELS, DELIBERATELY. The eyebrow is now the
   summary on the row above, and printing it again inside is the exact duplication
   `E275` just fixed on `/optimize`.

   ⚠ `SellSection` IS NOT DELETED and is not deprecated. It still renders the five
   SELL sections below, and it is the shared band elsewhere. This changed what the
   SPINE uses, not what exists.

   ⚠ THE THREE PLACEHOLDERS ARE DOWN TO ONE. §2's heading and body were marked
   `⚠ PLACEHOLDER — chat's words, not Scott's`; both are gone, replaced by his own
   tagline in `lib/learn-steps.ts`. The tier wording in row 2 is still the
   mockup's and is still his to replace.
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * ONE BLOCK INSIDE A PANEL: a heading, a body paragraph and a graphic.
 *
 * ⚠ A PANEL IS A LIST OF THESE, NOT ONE OF THESE, AND ROW 3 IS WHY. It carries
 * two sections' content, and `E283` records the cost: merging course and lesson
 * into one row collapses a level this page was built to teach. Composing it as
 * two blocks keeps that level visible INSIDE the panel. ⚠ Do not "simplify" this
 * to a single block by writing a merged sentence — that would be re-authoring
 * Scott's strings and it would finish the collapse the two blocks exist to
 * resist.
 */
/**
 * ⚠ THERE IS NO `body` FIELD ANY MORE, AND ITS ABSENCE IS THE FORMAT (`P1-J0-E305`).
 *
 * Scott, 2026-08-24, with `/optimize` and `/learn` side by side: *"image 1 is the
 * correct format. image 2 is a section in LEARN...that needs to be changed (they
 * all do)."* `/optimize`'s panels are eyebrow + headline + graphic. No body copy.
 * All five of Learn's grey body paragraphs were deleted to match — every sentence
 * is listed verbatim in the brief report, because several carried walk decisions.
 *
 * ⚠ DO NOT RE-ADD THE FIELD TO "JUST EXPLAIN ONE ROW". The moment one panel has a
 * paragraph the format has diverged again, and this is the second time these two
 * pages have been brought back into line.
 */
type PanelBlock = {
  heading: string;
  graphic: ReactNode;
  /** Extra content below the graphic. Only row 2 uses it, for `InstructorTiers`. */
  extra?: ReactNode;
};

/**
 * ⚠ KEYED BY STEP NUMBER, AND THE LABELS ARE NOT HERE. They live in
 * `lib/learn-steps.ts` so `check:ui` can assert the rendered summaries against
 * their source WITHOUT importing React. A guard comparing the page to a literal
 * it typed itself proves only that somebody typed the same thing twice.
 */
const PANELS: Record<number, PanelBlock[]> = {
  1: [
    {
      /*
        ⚠ THIS HEADING IS THREE WALK ERRORS FOLDED INTO ONE SENTENCE, and the composition is the
        approved mockup's, not mine to re-do:

          · `P1-J3-E018` gave the eyebrow and the sentence "The learning path reflects your
            overall area of study."
          · `P1-J3-E016` gave the MAPPING — paths correspond to FUNCTIONAL AREAS.
          · `P1-J3-E017` gave the INSTRUCTION — "Select one or more … based on your area of
            interest."

        ⚠ PRINTING ALL THREE WOULD SAY THE SAME THING TWICE. "reflects your overall area of
        study" and "based on your area of interest" are one idea; so the heading carries E016's
        mapping plus E017's instruction, and E018's sentence is DEMOTED INTO THE BODY where it
        reads as amplification instead of repetition.

        ⚠ "FUNCTIONAL AREAS" IS THE CATALOG'S OWN VOCABULARY, which is the argument for it:
        `Lesson.kind` carries `FA_OVERVIEW` = "Functional Area Overview" (`lib/learn.ts`) and the
        live catalog holds six "2. Functional Area Overview" section rows. The catalog has always
        organised itself this way; the page has never said so. (One collision to KNOW, not to
        solve: `app/assess/scope/page.tsx` uses "Functional Area" as a rung of a different,
        unbuilt hierarchy. Same words, different ladder.)

        ⚠ "ONE OR MORE" IS A PRODUCT CLAIM AND IT CHECKS OUT — `learn_enrollments` is unique on
        `[user_id, learning_path_id]`, which blocks a duplicate enrolment in ONE path and permits
        any number of DIFFERENT concurrent paths.

        ⚠ `based`, not Scott's typed `base`, and `your` for his `you` — corrected under his
        standing instruction, recorded here so neither reads as a rewrite.
      */
      /*
        ⚠ VERBATIM SCOTT, 2026-08-24 (`P1-J0-E305`), AND IT OVERRULES HIS OWN EARLIER
        ROW. `P1-J3-E016` gave the mapping `functional areas`; this replaces it with
        `business processes and/or departments`. Recorded, not treated as a typo.

        ⚠⚠ AND IT COLLIDES WITH ROW 3, TWENTY MINUTES LATER THE SAME DAY. Row 3's new
        headline (`P1-J0-E308`) says courses and lessons explain `functional areas`.
        The page now says paths map to business processes and/or departments AND that
        courses explain functional areas. ⚠ ROW 3 IS THE ONE THAT MATCHES THE DATA —
        `Lesson.kind` carries `FA_OVERVIEW` = "Functional Area Overview" and the live
        catalog holds six "2. Functional Area Overview" section rows. THIS row is the
        one the data does not back. Both are Scott's, both ship; he said *"do it as
        written, i will refine."* ⚠ DO NOT RECONCILE THEM HERE.

        ⚠ HIS HYPHEN `-`, NOT AN EM DASH. `/optimize`'s equivalent copy uses `—`;
        shipped as typed and reported.

        ⚠ THE OLD BODY IS GONE AND IT TOOK `P1-J3-E018`'s SENTENCE WITH IT — *"The path
        reflects your overall area of study."* was deliberately DEMOTED into the body by
        E018 so it read as amplification rather than repetition. Off the page entirely.
      */
      heading:
        "Learning paths correspond to business processes and/or departments - select one or more based on your interests.",
      graphic: <EnrollShot />,
    },
  ],
  2: [
    {
      /*
        ⚠ THE SUBJECT IS THE INSTRUCTOR, NOT MESSAGING, AND THAT SPLIT IS THE WHOLE POINT OF THIS
        PANEL (`P1-J3-E014`). It is now ROW 2, `Meet Your Instructor` — the row label carries the
        same split the copy does, which is why `Meet` and not `Connect`.

        WHAT IS BUILT: teaching is recorded PER LESSON, most lessons carry an `expert_person_id`,
        a path's and a course's instructors are DERIVED from those, and real photos ship. So
        naming the person who recorded the lesson is TRUE TODAY and is written in the present
        tense.

        WHAT IS NOT BUILT: the verb. There is STILL no `Conversation`, `Message` or `Thread`
        model anywhere in the schema, and `/messages` renders a `disabled` composer whose
        placeholder says "Messaging isn't available yet". So this panel ships with NO MESSAGING
        COPY IN THE PRESENT TENSE and NO COMPOSER — the two tiers that need the verb are marked
        `earned` and `soon` in the tier list below, and that reasoning is unchanged by the move.

        ⚠ THE ROW LABEL BECOMES `Connect with Your Instructor` THE DAY CONNECTIONS SHIP, and it
        is ONE string, in `lib/learn-steps.ts`. Nothing in this panel changes with it.

        ⚠ THE FIVE SELL SECTIONS BELOW ALREADY PROMISE MESSAGING TWICE ("the instructor is in
        it", "Message an instructor when the group is not enough"), and `One-on-one` now overlaps
        this row directly. That pre-existing overselling is REPORTED, not fixed here — the sell
        sections are explicitly out of scope and Scott wants them confirmed first.
      */
      /*
        ⚠ VERBATIM SCOTT, 2026-08-24 (`P1-J0-E307`), with ONE terminal period — he
        typed two.

        ⚠⚠ IT MAPS ONTO THE THREE TIERS BELOW IT EXACTLY, WHICH IS WHY
        `InstructorTiers` IS NOT OPTIONAL UNDER THIS HEADLINE:

            "Connect with your instructor"  -> FREE, the baseline
            "join their community"          -> FREE, `Ask the group`
            "book one-on-one time..."       -> PAID, `Book time one-to-one` [SOON]

        ⚠ THE SENTENCE CARRIES NO PRICING SIGNAL. All three clauses read as equally
        available and equally included. The tier list beneath is the ONLY thing on the
        page saying the third is paid and unbuilt. ⚠ IF `InstructorTiers` IS EVER
        REMOVED, THIS SENTENCE PROMISES PAID, UNBUILT ONE-TO-ONE TRAINING FOR FREE.

        ⚠ `for direct training or support` IS A NEW PROMISE AND NOTHING BACKS IT. No
        booking flow, no scheduling model, no `Conversation`/`Message` model
        (`P1-J3-E014`). `[SOON]` on the tier row is the only honest marker.

        ⚠ THIRD APPEARANCE OF THE CONNECT CLAIM ON ONE PAGE — the hero sub (`E290`), the
        step 2 label (`E296`), and this headline. Each Scott's, each flagged, none built.

        ⚠ THE DELETED BODY TOOK *"Every lesson carries its instructor..."* — the sentence
        that made the INSTRUCTOR the subject rather than messaging. The tier list still
        does that work; the prose no longer does.
      */
      heading:
        "Connect with your instructor, join their community, and book one-on-one time for direct training or support.",
      graphic: <InstructorsShot />,
      extra: <InstructorTiers />,
    },
  ],
  /*
    ⚠ TWO BLOCKS, AND THE SECOND IS NOT A SUB-POINT OF THE FIRST. Row 3 is `Watch Each Course and
    Its Lessons`: a COURSE is level 2 of the hierarchy and a LESSON is level 3. Both strings are
    Scott's, both move verbatim, and neither was merged into a new sentence.
  */
  3: [
    {
      /*
        ⚠ VERBATIM SCOTT, 2026-08-24 (`P1-J0-E308`), with ONE correction: `functional`,
        not his typed `functionals`. Standing instruction; recorded so it does not read
        as a rewrite.

        ⚠⚠ THE PANEL WAS TWO STACKED BLOCKS AND IS NOW ONE. `E283` created that merge —
        row 3 carried a COURSE block and a LESSON block kept visibly separate inside the
        panel, precisely because merging them collapses a level this page was built to
        teach. Scott has now collapsed it anyway, in one sentence naming both.

        ⚠ WHAT WENT WITH THE SECOND BLOCK: its headline *"Lessons explain how to create,
        change, and find transactions."* and `LessonShot` — the video player, the
        `2.3 — How to Create a Requisition · 6:41` caption and the timestamp list. He
        named that image specifically.

        ⚠ `CourseStepsShot` SURVIVES — the section list with the progress bar. He named
        image 2 only, so image 1 stays.

        ⚠ THE VERB LIST IS STILL HIS AND STILL NOT ALPHABETISED — create/find/change is
        the sequence a practitioner works in. The live section stems are `1. Course
        Overview`, `2. Create New`, `3. Find Existing`, `4. Change Existing`.

        ⚠ `functional areas` HERE CONTRADICTS ROW 1's `business processes and/or
        departments`. This is the row that matches the catalog's own vocabulary. See
        row 1's note; both ship, Scott reconciles.
      */
      heading:
        "Courses and lessons explain functional areas and applications as well as how to create, find and change transactions within those applications.",
      graphic: <CourseStepsShot />,
    },
  ],
  4: [
    {
      /*
        ⚠ NO COUNT, NO PATH NAME, NO "EVERY PATH" — deliberately, because the catalog cannot keep
        that promise yet. Re-measured against the LIVE database 2026-08-21: 23 learning paths, of
        which 7 hold a publishable question set and ZERO are published, so no learner can sit a
        test today. This copy describes what a certificate IS and what it is worth, so it stays
        true as the catalog fills instead of needing a rewrite per path.

        ⚠ THE SAME COUNT IS WHY THE TAGLINE ABOVE LOST `for most learning paths` — see
        `lib/learn-steps.ts`. Two surfaces, one measurement.

        ⚠ THE ROW LABEL SAYS `Take Certification Test`, WHICH IS AN ACTION AND NOT AN SLA. Scott's
        tagline said the certificate arrives `within 24 hours`; `b5f3923` added a HUMAN review
        gate with no queue, no timer and no alert behind it, so that number is not stated
        anywhere on this page.
      */
      /*
        ⚠⚠ VERBATIM SCOTT (`P1-J0-E309`), AND IT IS THE EXACT CLAIM THE COMMENT THAT
        USED TO SIT HERE EXISTED TO PREVENT. That note read: *"NO COUNT, NO PATH NAME,
        NO 'EVERY PATH' — deliberately, because the catalog cannot keep that promise
        yet."* `Each Learning path has its own test` IS that promise.

        Measured against the live DB 2026-08-24 (`P1-J3-E030`):

            learning paths                          23
            hold a LearnAssessment row at all        8
            publishable                              7
            ⚠ a learner can sit today                0

        So `each` is false for 15 of 23 on its face, and false for all 23 in practice.

        ⚠ SHIPPED ANYWAY — `decisions-01.md` 2026-08-24: outstanding parts gate
        PROMOTION, not the build. ⚠ IT BELONGS ON THE PRE-LAUNCH LIST. It is the single
        strongest unkeepable promise on this page, and `E304` puts a second one
        (`certification in hours`) into the page's largest text the same day.

        ⚠ `Learning path` IS HIS CAPITALISATION — capital `L`, lowercase `p`. Shipped as
        typed; the rest of the page uses `learning path` or `Learning Path`.

        ⚠ THE SECOND CLAUSE IS TRUE AND NEEDS NO FLAG: `issued_from = LEARN`,
        `public_credential_url` holds `/verify/{id}`, the verify page exists, and since
        `c68fad4` a learner with no seller profile earns a real one.

        ⚠ THE DELETED BODY TOOK *"The test covers the whole path, not a single course"* —
        the path-vs-course distinction the spine spends three rows teaching. The new
        headline implies it; the page no longer says it.
      */
      heading:
        "Each Learning path has its own test, and every certificate is verified, issued by Panameer, and published to your profile with a link you can put anywhere.",
      /*
        ⚠⚠ THE TAIL OF THIS SENTENCE IS STEP 5's OLD PANEL, FOLDED UP (`P1-J0-E322`).
        *"...published to your profile with a link you can put anywhere"* was its own
        step under the label `Tell Your Peers`, which is the `E296`/`E310` mismatch.
        Issued, verified and publishes-with-a-link is ONE idea and this is its home.

        ⚠ SCOTT'S TWO CLAUSES ARE UNCHANGED — `Each Learning path has its own test`
        (his capitalisation, capital L lowercase p) and `every certificate is verified
        and issued by Panameer`. Only the third clause is new here, and it is his own
        words from the old step 5, not a rewrite.

        ⚠ THE `each` FLAG STANDS AND GETS NO WEAKER: 23 paths, 8 with a
        `LearnAssessment`, 7 publishable, **0 sittable today**. Still the strongest
        unkeepable promise on the page, still for the pre-launch list.
      */
      graphic: <PathCertificateShot />,
    },
  ],
  5: [
    {
      /*
        ── ⚠⚠ THIS PANEL IS NEW, AND STEP 5's OLD CONTENT MOVED UP TO STEP 4 ─────

        Scott, 2026-08-24 (`P1-J0-E322`): *"The tell your peers could be swapped out
        for 'Get Expert Support'. This is the 'keeps you working' idea. Now…we could
        still say the same and make sure it is referenced in step 2 or we call it out
        specifically. What do you think?"* He asked for an answer: CALL IT OUT AS ITS
        OWN STEP, and leave step 2 alone.

        ⚠ THE FOLD IS THE REAL FIX. Step 5 used to say *"Your certificate publishes to
        your profile, with a link you can put anywhere."* — a CREDENTIAL, under a label
        about advocacy. That is the mismatch `E296` raised and `E310` recorded as
        DELIBERATE when Scott took neither exit. `Get Certified!` was always its
        natural home: issued, verified, and publishes to your profile with a shareable
        link is ONE IDEA. Splitting it across two steps was a leftover from the old
        six-section structure, and it is why step 5 never read right.

        ⚠ `Tell Your Peers` IS RETIRED. `E296` AND `E310` BOTH RECORDED IT AS SETTLED
        — THIS SUPERSEDES BOTH. Do not restore the label citing either row.
        ⚠ AND REMOVING IT REMOVES THE ONLY THING THAT IMPLIED A REFERRAL FEATURE. No
        referral, share or invite model exists and none is being built; that stays true
        and is now also unimplied.

        ── ⚠⚠ DRAFT — CC's WORDS, NOT SCOTT'S ──────────────────────────────────

        He gave the LABEL only. This sentence is drafted and reported verbatim so he
        can overwrite it in one message.

        ⚠ IT IS DELIBERATELY NOT STEP 2. Step 2 is MEETING the instructor — who they
        are, that they are named on every lesson, and the three access tiers. This is
        AFTER the course: the problem you hit at work, months later. Two moments in one
        relationship, and the drafts do not read alike — step 2 says *"Connect with
        your instructor, join their community, and book one-on-one time"*; this says
        nothing about meeting anyone and everything about a question you already have.

        ⚠⚠ THE HONEST COST, AND IT IS THE WORST THING IN THIS WORK STREAM: STEPS 2 AND
        5 NOW BOTH LEAN ON MESSAGING THAT DOES NOT EXIST. No `Conversation`, `Message`
        or `Thread` model; `/messages` ships a disabled composer (`P1-J3-E014`). Two of
        five steps promise the same missing feature, which makes the PAID ONE-TO-ONE
        TIER the most load-bearing unbuilt thing on the site. Reported as its own line.

        ⚠ SO THE SENTENCE NAMES THE GROUP FIRST — that is `ForumThread`/`ForumPost`,
        which exist — and the expert second, which is the paid `soon` tier in
        `InstructorTiers`. It carries no present-tense messaging verb: no `message`,
        `chat`, `DM` or `reply`.
      */
      heading:
        "Months later, when the real problem lands, the group and the expert who taught you are still there.",
      /*
        ⚠ `InstructorsShot` IS REUSED, NOT REDRAWN. It shows the instructors named on
        lessons, which is exactly who this step is about, and it is already on the page
        in step 2 — the same faces in both places is the point: one relationship, two
        moments. ⚠ A "support ticket" or "chat thread" screen would be a picture of
        unbuilt software, the same trap `P1-J1-E017` left steps 3 and 5 empty for.
      */
      graphic: <InstructorsShot />,
      /*
        ⚠ `InstructorTiers` IS **NOT** REPEATED HERE. It renders in step 2, and it is
        the only thing on the page that says the one-to-one tier is PAID and `soon`.
        Printing it twice would read as two different offers. ⚠ BUT THAT MEANS THIS
        PANEL'S PROMISE IS PRICED TWO ROWS AWAY — see the note above.
      */
    },
  ],
};

/**
 * THE PANEL RENDERER — `/optimize`'s FORMAT, TRANSCRIBED (`P1-J0-E305`).
 *
 * Scott, 2026-08-24: *"image 1 is the correct format. image 2 is a section in
 * LEARN...that needs to be changed (they all do)."*
 *
 *   `/optimize`  =  magenta uppercase eyebrow  +  large dark headline  +  graphic
 *   `/learn` was =  headline  +  grey body paragraph  +  graphic, no eyebrow
 *
 * ── ⚠ THE VALUES ARE TRANSCRIBED FROM THE LIVE PAGE, NOT EYEBALLED ──────────
 *
 * Measured on `/optimize` at 1440 with the panels open, 2026-08-24:
 *
 *   eyebrow  `home.css:1290`-family  19px / 700 / #d72cd6 / ls 2.66px / uppercase
 *            / line-height 28.5px / Montserrat  (`.pm-home .eyebrow`)
 *   headline `home.css`'s `.stepd-h2`               27px / 700 / #171e3e / ls -0.4px
 *            / line-height 32.4px / max-width 1040px / Comfortaa
 *
 * ⚠ THE HEADLINE NEEDED NO WORK — `.stepd-h2` is the SHARED rule in
 * `step-disclosures.css`, so both pages already draw it from one place. Only the
 * eyebrow is new here, and it is Tailwind because `.pm-home .eyebrow` is scoped to
 * a wrapper this page is not inside. Same trap as `.sd-n`, `E290` and `E303`;
 * checked, not assumed.
 *
 * ── ⚠ THE EYEBROW IS DERIVED, NEVER TYPED ──────────────────────────────────
 *
 * `STEP {n} - {label}`, uppercased by CSS, from `LEARN_STEPS` — the same source the
 * summary above the panel renders. A hand-typed eyebrow is how a row ends up
 * labelled one thing closed and another thing open.
 *
 * ⚠ IT REPEATS THE ROW LABEL ON PURPOSE, AND THAT IS `/optimize`'s SHAPE, NOT AN
 * `E275` REGRESSION. E275 was about printing a `Step N - ` prefix INSIDE a label
 * that already had one. Here the closed row shows the label and the open panel
 * shows `STEP N - LABEL` as its eyebrow, which is exactly what `/optimize` does.
 * ⚠ `check:ui` §30 asserts a panel does not repeat its label; that assertion is
 * updated in the same commit and the reasoning is recorded there.
 */
function Panel({
  step,
  blocks,
}: {
  step: LearnStepLabel;
  blocks: PanelBlock[];
}) {
  return (
    <>
      {blocks.map((b, i) => (
        <div className="stepd-block" key={b.heading}>
          {/*
            ⚠ ONE EYEBROW PER PANEL, ON THE FIRST BLOCK ONLY. Every row is a single
            block since `E308` collapsed row 3, but the guard costs nothing and a
            second eyebrow inside one panel would read as a second step.
          */}
          {i === 0 && (
            <p className="mb-3 font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-[#d72cd6]">
              {`Step ${step.n} - ${step.summary}`}
            </p>
          )}
          <h2 className="stepd-h2">{b.heading}</h2>
          {b.graphic}
          {b.extra}
        </div>
      ))}
    </>
  );
}

/**
 * ROW 2's THREE TIERS OF INSTRUCTOR ACCESS (was §7's, before the disclosures).
 *
 * ⚠ THE THREE TIERS ARE A LOCKED DECISION (`decisions-01.md` § *Instructor access has THREE
 * tiers*, Scott 2026-08-20): the group community is FREE, entry to a group chat is EARNED with
 * Community Credits, and one-to-one time is PAID.
 *
 * ⚠ THE PAID TIER SELLS RESERVED TIME, NOT ACCESS — Scott: "i want to count on talking to you
 * at this time." Copy that prices access instead of certainty misstates the model, which is why
 * the line reads "a reserved slot".
 *
 * ⚠ WHICH OF connect / message / mentoring MAPS TO WHICH TIER IS NOT DECIDED — Scott: "will
 * answer when i get time." So the labels below are the mockup's PLACEHOLDERS, left verbatim.
 *
 * ⚠ ONLY THE FREE TIER IS PRESENT TENSE. The other two carry a marker, because the verb they
 * need does not exist in the schema.
 */
/**
 * ── ⚠⚠ REBUILT ON THE FREE-CONNECTION DECISION (`P1-J0-E306`, 2026-08-24) ────
 *
 * Scott, screenshotting the old list: *"does our latest discussion change this."*
 * It did. Three of the four lines were wrong. Authority:
 * `2. Claude Sub-Files/connection_model_decision.md` and `decisions-01.md`'s
 * 2026-08-24 section. ⚠ THE COPY BELOW IS WRITTEN FROM THAT DOC, NOT FRESH.
 *
 * ── WHAT WAS THERE, AND WHY EACH LINE DIED ─────────────────────────────────
 *
 * 1. ⚠⚠ `CREDITS · Group chat [EARNED]` — *"Entry comes from Community Credits,
 *    not a card."* DELETED. **Credits as an ACCESS CURRENCY are dead** and the
 *    ledger is cut from the near-term build: *"building a ledger to ration one
 *    thing is a bad trade."* A row whose entire subject is a currency that will
 *    not exist cannot ship. ⚠ Credits as an ENGAGEMENT LOOP (a rewards program)
 *    are still alive as an idea — a different build, much later. ⚠ Group chat is
 *    not deleted either; it is the FREE group ask below.
 *
 * 2. ⚠ `Connect` IS NO LONGER A TIER. Connection is free and unlimited for
 *    everyone, so it is the BASELINE, not a rung. A ladder whose first rung is
 *    the thing everybody already has teaches that connecting is rationed.
 *
 * 3. ⚠⚠ THE OLD FREE ROW BROKE THE ONE RULE THE DECISION ADDED. *"Ask where you
 *    are stuck; THE INSTRUCTOR IS IN THE ROOM"* said the instructor answers, on
 *    the FREE tier. The decision is explicit that **`Ask a question` with an
 *    unnamed recipient is the form to ban**, and that asking the instructor is
 *    the PAID rung. That was the bait-and-switch the rule exists to prevent.
 *
 * ── ⚠ EVERY ROW NAMES WHO ANSWERS. THAT IS THE WHOLE POINT ─────────────────
 *
 * Scott: *"I think we need to clarify WHO is being asked. One is the
 * instructor...the other is the group."*
 *
 * ⚠ THE MIDDLE ROW IS NEW AND IT IS SCOTT'S OWN IDEA — *"maybe connect allows you
 * to see the questions the paid peeps are asking?"* The decision doc calls it the
 * best line in the spec: free, genuinely valuable, and it costs the instructor
 * nothing extra because they are answering anyway. ⚠ It depends on the row above
 * it existing; that is why it is second, not first.
 *
 * ⚠ NO PRESENT-TENSE MESSAGING CLAIM ON ANY ROW. `P1-J3-E014` still holds —
 * `/messages` still ships a `disabled` composer reading "Messaging isn't available
 * yet". The paid row is marked `soon` and says nothing in the present tense.
 *
 * ⚠⚠ THIS BLOCK IS LOAD-BEARING UNDER ITS OWN HEADLINE. `E307`'s sentence above it
 * promises one-to-one booking with no pricing signal; these three rows are the
 * ONLY thing on the page saying the third clause is paid and unbuilt. Removing
 * this block turns that headline into a free-of-charge promise. See the note on
 * row 2's heading.
 *
 * ⚠ IT IS NOT A "BODY PARAGRAPH" AND `E305` DOES NOT DELETE IT. E305 removed panel
 * body COPY; this is the tier list and it survives, rebuilt.
 */
const TIERS = [
  {
    tag: "Free",
    tagClass: "text-[#137a51]",
    title: "Ask the group",
    marker: null,
    /* ⚠ BUILDABLE TODAY — `ForumThread` / `ForumPost` exist in the schema. This is
       the row the decision doc says ships FIRST, and it is also what GENERATES the
       questions the row below displays. */
    sub: "Other learners answer, in the path's community.",
  },
  {
    tag: "Free",
    tagClass: "text-[#137a51]",
    title: "Read what was asked of the instructor",
    marker: null,
    /* ⚠ NOBODY ANSWERS — THIS IS A READ, and saying so is the point. It is the
       public-feed analog, and it needs the row above to have any content. */
    sub: "Nobody answers this one — you are reading what already was.",
  },
  {
    tag: "Paid",
    tagClass: "text-magenta",
    title: "Book time one-to-one",
    /* ⚠ `soon` IS THE ONLY HONEST MARKER ON THIS PANEL. No booking flow, no
       scheduling model, no `Conversation`/`Message` model. */
    marker: "soon",
    /* ⚠ THE PAID TIER SELLS RESERVED TIME, NOT ACCESS — Scott: "i want to count on
       talking to you at this time." Copy that prices access instead of certainty
       misstates the model. Unchanged from the row that was already correct. */
    sub: "A reserved slot — you can count on talking to them at that time.",
  },
] as const;

function InstructorTiers() {
  return (
    <div className="mt-4">
      {TIERS.map((t) => (
        <div
          key={t.title}
          className="flex items-start gap-3 border-t border-line py-3"
        >
          <span
            className={
              "w-[88px] flex-none py-1 font-display text-[10.5px] font-bold uppercase leading-none tracking-[0.08em] " +
              t.tagClass
            }
          >
            {t.tag}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold leading-[1.35] text-ink">
              {t.title}
              {t.marker ? (
                <span className="ml-[7px] inline-block rounded-full border border-line px-[7px] py-[2px] align-middle font-display text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-ink-2">
                  {t.marker}
                </span>
              ) : null}
            </span>
            <span className="mt-[2px] block text-[12px] leading-[1.45] text-ink-2">
              {t.sub}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/*
  ── ⚠ `SECTIONS` IS GONE (`P1-J0-E312`) ───────────────────────────────────────

  The five sell sections it held — `Learning paths` · `Free & certified` ·
  `Learn together` · `One-on-one` · `Your brand` — were deleted from this page on
  Scott's instruction: *"REMOVE these sections."* The array went with them rather
  than being left dead; a five-entry data structure nothing renders is an invitation
  to render it again.

  ⚠ THE COMPONENTS THEMSELVES ARE STILL ON DISK, UNIMPORTED — `PathProgressShot`,
  `CertificateShot`, `CohortRoomShot`, `MentorDmShot`, `LearnerProfileShot`. Same
  rule as `E164`/`DashboardShot`: this page stopped calling them, which is not the
  same as deciding they are worthless. ⚠ `SellSection` is also untouched and is
  still the shared band elsewhere.

  ⚠ WHAT THE DELETION CLOSED is recorded at the render site, including the
  path-vs-course room decision that would otherwise have vanished with
  `Learn together`.
*/

/**
 * ── ⚠ SEE-THROUGH CARDS, TRANSCRIBED FROM `/optimize` (`P1-J0-E303`) ────────
 *
 * Scott, 2026-08-24, with both screenshotted: *"make learn like optimize. see thru
 * cards."* This shipped as bare numbers under a hairline rule; `/optimize` ships
 * three translucent cards over the hero art.
 *
 * ⚠ MEASURED FROM THE LIVE PAGE, NOT EYEBALLED FROM THE SCREENSHOT. `/optimize` at
 * 1440, 2026-08-24 — `.pm-home .stats` / `.stat` (`home.css:270`-family):
 *
 *     wrapper   grid, 3 equal columns, gap 14px, margin-top 26px
 *     card      background rgba(255,255,255,.06)
 *               border    1px solid rgba(255,255,255,.13)
 *               radius    14px
 *               padding   18px 16px
 *     value     34px / 700 / #fff / line-height 34px / Comfortaa
 *     label     12.5px / 400 / #cec7db / line-height 16.25px / margin-top 8px
 *
 * ⚠ TAILWIND, NOT THE CLASSES. `.pm-home .stats` is scoped to a wrapper this page
 * is not inside — the same trap as `.sd-n`, `E290` and `E303` itself. Checked
 * against the computed styles rather than assumed.
 *
 * ⚠ THE LABEL CASING CHANGED TOO AND SCOTT DID NOT MENTION IT. This shipped
 * `LEARNING PATHS` (uppercase, letter-spaced); `/optimize` ships
 * `Assessments Completed`. *"Like optimize"* covers it, so `/optimize`'s casing is
 * what ships — REPORTED, and it is one class to revert.
 *
 * ⚠ THE NUMBERS DO NOT CHANGE. `23 / 54 / 522` still come from
 * `lib/learn-catalog-counts.ts` with their measured-on date; `check:learn` GUARD 3c
 * is untouched and still asserts this component imports rather than inlines them.
 */
function LearnStats() {
  return (
    <dl className="mt-[26px] grid grid-cols-3 gap-[14px]">
      {CATALOG_COUNTS.map((s) => (
        <div
          key={s.label}
          className="rounded-[14px] border border-white/[0.13] bg-white/[0.06] px-4 py-[18px]"
        >
          <dd className="font-display text-[34px] font-bold leading-[34px] text-white">
            {s.value}
          </dd>
          <dt className="mt-2 text-[12.5px] font-normal leading-[16.25px] text-[#cec7db]">
            {s.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

export function LearnPublic() {
  return (
    <>
      {/*
        ── ⚠ BOXED, NOT FULL-BLEED (P1-J0-E264) ───────────────────────────────

        Scott: *"LEARN/SHOP: the Section 1 is fullwidth (incorrect) — I want it to
        be a boxed layout like the HOME."* This hero was the THIRD implementation
        of a public hero — hand-rolled here, neither `HomeHero` nor
        `MarketingHero` — which is the part of E264 he could not see from the
        outside. It now shares `HeroBox` with the five `MarketingHero` pages.

        ⚠ THE CONTAINER IS UNCHANGED BY `E280`; ONLY THE WORDS MOVED. Both the
        `<h1>` and the lede are Scott's verbatim strings, replaced 2026-08-22.

        ⚠ THE NEW `<h1>` IS LONGER — `Get Trained, Get Certified, Get Hired, and
        Stay Supported` against `Learn it here. Get certified. Get hired.` — so it
        wraps where the old one did not. It was RE-MEASURED at 1440 / 900 / 390
        against sampled frames of the clip, not against a mockup; the mockup's
        hero has no video, so its contrast is not proof of this one's.

        ⚠ `Stay Supported` IS THE FOURTH PROMISE AND IT IS THE THINNEST. What
        backs it today is the instructor named on every lesson and the free group
        community; the two tiers that need messaging are marked `earned` and
        `soon`. Scott's string, shipped as written.

        ⚠ `isolate` MOVED TO THE CARD along with the gradient, because it is what
        keeps the video and the scrim stacking inside this hero rather than
        against the page. `overflow-hidden` now comes from `HeroBox`, which is
        also what makes the clip respect the radius — the same reason `HomeHero`
        needs two elements rather than one.
      */}
      <HeroBox cardClassName="isolate bg-[linear-gradient(150deg,#1b1f45_0%,#33194f_55%,#4a1a5e_100%)] text-white">
        <section className="px-6 py-16 min-[900px]:py-[84px]">
          {/*
          ⚠ THE GRADIENT UNDER THIS IS NOT DECORATION AND MUST STAY. It paints before the clip
          arrives, it is what a `prefers-reduced-motion` visitor sees, and it is the only thing
          guaranteeing the white headline is legible — footage is whatever the camera saw. The
          mockup's hero has no video, so its contrast is not proof of this one's; the H1 was
          measured against sampled frames of the clip, not against the mockup.

          Same component, same clip and same treatment as the SIGNED-IN LearnHome hero, so
          creating an account does not change the footage under you.
        */}
          <HeroVideoBackdrop
            src="/learn.mp4"
            videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
            scrimClassName="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,11,28,0.82)_0%,rgba(40,20,80,0.62)_45%,rgba(215,44,214,0.30)_100%)]"
          />

          {/*
          ⚠ TWO COLUMNS NOW, VIA THE SHARED `HeroTwoUp` (`P1-J0-E291`). Scott, with
          both heroes screenshotted side by side: *"Structuring. I want you to
          structure LEARN like you did OPTIMIZE."*

          ⚠ THIS PAGE CANNOT USE `/optimize`'s HERO CSS AND THAT WAS CHECKED, NOT
          ASSUMED — every rule is `.pm-home`-scoped (`home.css:182`, `:200`, `:235`,
          `:257`) and this page is Tailwind, outside that scope. `HeroTwoUp` shares
          the STRUCTURE; the skin is local to each caller, which is also what let
          `/optimize` measure byte-identical through the extraction.

          ⚠ THE COLUMNS ARE `min-[901px]`, NOT `min-[900px]` — `home.css`'s hero
          collapses at `max-width:900px`, which INCLUDES 900, so the two heroes have
          to break at the same width or 900 shows one column on one page and two on
          the other.
        */}
          <div className="relative z-[2] mx-auto max-w-[1136px]">
            <HeroTwoUp
              rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
              left={
                <>
                  {/*
                  ⚠ VERBATIM SCOTT, 2026-08-24 (`P1-J0-E320`): *"Go from Zero to
                  Hero…and Stay There"*.

                  ⚠ HIS ELLIPSIS `…` WITH NO SPACES EITHER SIDE, SHIPPED AS TYPED.
                  A single character, not three dots.

                  ⚠⚠ NO TERMINAL PERIOD, AND THAT REVERSES HIS OWN EARLIER REQUEST.
                  `P1-J0-E289` was Scott asking for a period on THIS `<h1>`, and
                  `E313` added one on that basis. He typed none this time. Shipped as
                  typed; the reversal is reported.

                  ⚠ `Stay Supported` IS GONE, AND THAT CLOSES `E313`'s FLAG. CC
                  reported that nothing on the page backed the word "Supported" —
                  the sell sections had been deleted, no messaging model exists, and
                  the one-to-one tier is marked `soon`. `Stay There` is a claim about
                  the LEARNER'S state, not about a Panameer service, so it needs no
                  feature behind it. ⚠ THAT FLAG IS CLOSED, NOT CARRIED FORWARD.

                  ⚠ IT IS INCONSISTENT WITH `/` AND `/optimize`, WHICH HAVE NO
                  TERMINAL PERIOD EITHER — so this `<h1>` now MATCHES them, where
                  `E313` had made it the odd one out. `/hire-talent` also has none.
                  `/find-work` and the three PLACEHOLDER heroes do. Still a template
                  question, and still Scott's once.
                */}
                  <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                    Go from Zero to Hero…and Stay There
                  </h1>
                  {/*
                  ⚠⚠ BOTH BUTTONS SURVIVE, AND IT IS A DECISION. Scott, 2026-08-24:
                  *"The two buttons that you have there are great. keep
                  those...add the rest."*

                  ⚠ THIS DIVERGES FROM `/optimize`, WHICH HAS ONE CTA, DELIBERATELY —
                  `/learn` has a real signed-out browse path and `/optimize` does not.
                  Do not "align" the two heroes by deleting one.
                */}
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                      href="/login?callbackUrl=/learn"
                      className="rounded-[12px] bg-magenta px-7 py-4 font-display text-[16px] font-bold text-white"
                    >
                      Create Your Free Account
                    </Link>
                    <Link
                      href="/learn/courses"
                      className="rounded-[12px] border border-white/35 px-7 py-4 font-display text-[16px] font-bold text-white"
                    >
                      Browse the Catalog
                    </Link>
                  </div>
                  {/*
                  ⚠⚠ THE SIGNED-OUT FOOTNOTE IS GONE (`P1-J0-E301`). Scott, 2026-08-24:
                  *"remove this text. messes the feel."* It read: *"Browsing works
                  signed out. Paths, progress, certificates and instructors need an
                  account."*

                  ⚠ HE REVERSED HIMSELF WITHIN THE HOUR — a reworded replacement was
                  drafted first and then killed. Do not ship either version.

                  ⚠ `E291` KEPT THIS LINE SPECIFICALLY BECAUSE IT WAS THE ONLY PLACE
                  THE PAGE SAID WHAT WORKS WITHOUT AN ACCOUNT. There is now nothing.
                  A signed-out visitor is told nothing about what needs signing in.

                  ⚠⚠ AND THE SENTENCE WAS ALREADY FALSE, WHICH IS THE PART WORTH
                  KNOWING. `Browse the Catalog` points at `/learn/courses`; measured
                  2026-08-24 signed out, that route returns 200 and renders
                  **"All Courses / This area is coming soon."** — zero links, zero
                  courses. `/learn/paths` (the real catalog) 307-redirects to `/learn`
                  when signed out. So "browsing works signed out" was not true, and the
                  second CTA is a dead end with nothing left to set expectations.
                  REPORTED; fixing the destination is not this brief.
                */}
                </>
              }
              right={
                <>
                  {/*
                  ⚠ VERBATIM SCOTT, 2026-08-24 (`P1-J0-E321`).

                  ⚠⚠ `...all for free` IS GONE, AND SO IS `free` FROM THE HERO
                  ENTIRELY. `P1-J0-E295` was Scott asking for `free` to be STRESSED
                  on this page; after `E304` replaced the tagline and this string
                  drops the clause, **`free` appears nowhere in the hero at all**.
                  ⚠ REPORTED, NOT RE-ADDED.

                  ⚠ `get certified` IS A PROMISE THE CATALOG CANNOT KEEP.
                  `P1-J3-E030`: 0 of 23 paths have a sittable test. Shipped as
                  written and flagged; this is now the page's second such claim
                  alongside `E304`'s `certification in hours` in the display headline.

                  ⚠ `connect with instructors` IS THE UNBUILT VERB AGAIN. No
                  `Conversation`/`Message`/`Thread` model; `/messages` ships a
                  disabled composer (`P1-J3-E014`). This is the THIRD page-surface
                  carrying it — the hero, step 2's label, and step 2's headline — and
                  `E322` adds a fourth in step 5. Counted and reported.

                  ⚠ `get the support you need to stay working` IS THE `Stay There`
                  IDEA, and it is what step 5 (`Get Expert Support`) exists to
                  deliver. The hero and the spine now agree on that beat, which they
                  did not when the hero said `Stay Supported` and nothing followed it.
                */}
                  <p className="text-[17px] leading-[1.6] text-[#e9e6f5] min-[901px]:text-[19px]">
                    Enroll in learning paths, connect with instructors, take
                    courses, get certified and get the support you need to stay
                    working.
                  </p>
                  {/*
                  ⚠⚠ WHITE, NOT PINK, AND THE TEXT IS `/optimize`'s (`P1-J0-E302`).
                  Scott, 2026-08-24: *"this isn't looking like i thought. Lets move both
                  of these back to white text and use the line we have in optimize —
                  'Check out the steps below and...'"*

                  ⚠ THIS REVERSES `E290` AND `E295`, BOTH SHIPPED HOURS EARLIER THE SAME
                  DAY. The `#efa3ee` mirror-from-`home.css:257` comments that used to sit
                  here and on the tagline are DELETED, not left as history — they would
                  teach a colour this page no longer uses.

                  ⚠⚠ AND IT CLOSES `P1-J0-E299` BY REMOVAL. The pink measured
                  3.09 / 4.19 / 4.06 : 1 against the brightest frames of the clip — a
                  live WCAG AA failure for normal text at all three widths. No pink, no
                  failure. The white is re-measured and reported.

                  ⚠ TWO READINGS OF "THE LINE WE HAVE IN OPTIMIZE" AND THIS IS THE ONE
                  SHIPPED: `/optimize`'s `hero-bridge` TEXT, rendered WHITE here.
                  ⚠ `/optimize`'s OWN bridge line STAYS PINK — he said "move BOTH OF
                  THESE", meaning the two on `/learn`. The two pages now diverge on
                  bridge colour, deliberately, and `/optimize` is not touched.

                  ⚠⚠ THE 3-MINUTE CLAIM DIED WITH THIS SENTENCE. It used to read *"Create
                  your account and start learning in under 3 minutes."* `E304` then
                  replaced the tagline below, which carried the only other instance — so
                  after these two changes `under 3 minutes` APPEARS NOWHERE ON `/learn`.
                  ⚠ SCOTT ASKED FOR THAT CLAIM TO BE STRESSED EARLIER THE SAME DAY
                  (`E295`). REPORTED; DO NOT RE-ADD IT.
                */}
                  {/*
                    ⚠ `text-white`, NOT THE SUB-COPY'S `#cec7db`, AND A MEASUREMENT
                    DECIDED IT. Scott said *"move both of these back to WHITE text"*.
                    The first cut used `#cec7db` — the colour of the paragraph above —
                    and it measured 3.51 / 4.80 / 4.62 : 1 against the brightest frames
                    of the clip, STILL FAILING WCAG AA for normal text at 1440. Pure
                    white measures 5.76 / 7.86 / 7.57 : 1 on the same backdrop and
                    passes at every width.

                    ⚠ SO THE BRIDGE LINE IS BRIGHTER THAN THE PARAGRAPH ABOVE IT, which
                    is also what makes it read as a distinct beat — `E295`'s "stress it"
                    intent now carried by brightness and placement rather than by pink.
                    The sub-copy's own `#cec7db` is unchanged and out of scope.
                  */}
                  <p className="mt-4 text-[17px] leading-[1.6] text-white min-[901px]:text-[19px]">
                    Check out the steps below to see how it works.
                  </p>
                  <LearnStats />
                </>
              }
            />
          </div>
        </section>
      </HeroBox>

      {/*
        ── ⚠⚠ THE TWO STRINGS SWAP ROLES (`P1-J0-E304`) ─────────────────────────

        Scott, 2026-08-24, screenshotting `/optimize`'s block: *"Lets use this
        format."* And confirming the target: *"That last fix is aimed at this. It is
        not the right format, size, etc."*

            `/learn` was:  `Here's How It Works`  = large dark Title-Case HEADLINE
                           the tagline            = small grey sub-copy
            `/optimize`:   `HERE'S HOW IT WORKS`  = small magenta UPPERCASE eyebrow
                           the tagline            = large dark display HEADLINE

        ⚠ THE TAGLINE IS PROMOTED, NOT RESTYLED. It becomes the biggest text in the
        block — which is why the three problems recorded in `lib/learn-steps.ts`
        matter MORE, not less: the weakest claims on the page just became its
        loudest.

        ⚠ MEASURED FROM THE LIVE PAGE, NOT EYEBALLED. `/optimize` at 1440, 2026-08-24:

            eyebrow   19px / 700 / #d72cd6 / ls 2.66px / uppercase / lh 28.5px
                      / Montserrat                       (`.pm-home .eyebrow`)
            headline  34px / 700 / #171e3e / ls -0.5px / lh 38.76px
                      / max-width 1040px / Comfortaa     (`.hiw-h2`)

        ⚠ TAILWIND, NOT THE CLASSES — both rules are `.pm-home`-scoped and this page
        is not inside that wrapper. Fourth instance of that trap today
        (`.sd-n`, `E290`, `E303`, here); checked against computed styles, not assumed.

        ⚠ `E302` REMOVED THE PINK SPAN FROM THE TAGLINE IN THE SAME PASS. A tagline
        promoted to a headline while still carrying an inline pink span would have
        been the worst of both.
      */}
      {/*
        ⚠ `pb-[80px]` MATCHES `/optimize`, IT IS NOT A NEW VALUE (`P1-J0-E319`).
        Scott: *"The HERE'S HOW IT WORKS section needs a little space between it and
        the first step."* Measured before choosing: the tagline-to-row-1 gap is
        **81px on `/optimize` at all three widths and 1px here** — so this was a
        DIVERGENCE from the template (`E281`), not a missing design decision.
        80px of bottom padding on top of the existing 1px lands on 81.

        ⚠ TAILWIND, NOT A `home.css` RULE — `/learn` is not inside `.pm-home`. Fifth
        time that scoping has mattered on this page.
      */}
      <section className="bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-[#d72cd6]">
            {LEARN_SPINE_HEADING}
          </p>
          {/*
            ⚠ THE HEADLINE NOW, NOT SUB-COPY. One string, no span — see `E302`'s note
            on the hero bridge line and the three flags in `lib/learn-steps.ts`.
          */}
          <h2 className="mt-6 max-w-[1040px] font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-[#171e3e] min-[900px]:text-[34px] min-[900px]:leading-[38.76px]">
            {LEARN_SPINE_TAGLINE}
          </h2>
        </div>
      </section>

      {/*
        ⚠ THE SAME COMPONENT `/optimize` RENDERS. One behaviour, one
        implementation — `E281` exists to stop this page hand-rolling a second
        accordion. The labels come from `lib/learn-steps.ts` and the panels from
        `PANELS` above; nothing here retypes a string.
      */}
      <StepDisclosures
        steps={LEARN_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: <Panel step={step} blocks={PANELS[step.n]} />,
        }))}
      />

      {/*
        ── ⚠⚠ THE FIVE SELL SECTIONS ARE GONE (`P1-J0-E312`) ───────────────────

        Scott, 2026-08-24, screenshotting all five: *"REMOVE these sections."*
        `Learning paths` · `Free & certified` · `Learn together` · `One-on-one` ·
        `Your brand`.

        ⚠ THIS REVERSES A STANDING OUT-OF-SCOPE MARKER. `P1-J0-E281`, `E283` and
        `E297` all said these were NOT in scope and to confirm before touching them.
        He has now confirmed, by deleting them. ⚠ DO NOT RESTORE THEM CITING THOSE
        ROWS.

        ⚠ `SellSection` IS NOT DELETED and is still the shared band elsewhere — only
        `/learn` stops calling it. `E164` rule.

        ── THREE THINGS THIS CLOSES FOR FREE ─────────────────────────────────

        · ⚠ `One-on-one`'s PRESENT-TENSE MESSAGING PROMISE IS GONE. It has been
          flagged in `E296`, `E306` and `E307` as contradicting step 2. Deleting the
          section resolves it — the contradiction is closed by removal, not by
          softening either side.
        · ⚠ `Learn together`'s *"Every course has a room"* IS GONE, and with it the
          course-vs-path scoping question. ⚠ THE PRODUCT DECISION STILL STANDS AND IS
          RECORDED HERE SO IT SURVIVES THE DELETION: a room belongs at the LEARNING
          PATH level, not the course level. `LearningPath.expert_person_id` names ONE
          instructor (`schema.prisma:2373`) while a course's must be DERIVED from
          `Lesson.expert_person_id` and may be several people; `LearnEnrollment` is per
          path; certification is per path; and 15 of 23 paths hold exactly one course,
          so course-scoping only fragments the 8 paths deep enough for a room to work.
        · ⚠ `Free & certified`'s *"Anyone can learn a new skill and get certified —
          free"* IS GONE — one of the three unkeepable certification promises
          (`P1-J3-E030`: 0 of 23 paths have a published test). ⚠ THE OTHER TWO STILL
          SHIP: `E304`'s `certification in hours` in the block above, now the page's
          largest text, and `E309`'s `Each Learning path has its own test`.

        ⚠ `InstructorTiers` IS NOT A SELL SECTION. It lives in row 2's PANEL and
        survives, rebuilt by `E306`.
      */}
    </>
  );
}
