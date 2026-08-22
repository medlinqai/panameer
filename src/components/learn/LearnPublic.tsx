import type { ReactNode } from "react";
import Link from "next/link";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { HeroBox } from "@/components/marketing/HeroBox";
import { SellSection } from "@/components/marketing/SellSection";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import {
  LEARN_STEPS,
  LEARN_SPINE_HEADING,
  LEARN_SPINE_TAGLINE,
} from "@/lib/learn-steps";
import { PathProgressShot } from "@/components/learn/public/PathProgressShot";
import { CertificateShot } from "@/components/learn/public/CertificateShot";
import { CohortRoomShot } from "@/components/learn/public/CohortRoomShot";
import { MentorDmShot } from "@/components/learn/public/MentorDmShot";
import { LearnerProfileShot } from "@/components/learn/public/LearnerProfileShot";
import { SixStepShot } from "@/components/learn/public/SixStepShot";
import {
  EnrollShot,
  CourseStepsShot,
  LessonShot,
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
type PanelBlock = {
  heading: string;
  body: string;
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
      heading:
        "Learning paths correspond to functional areas — select one or more based on your area of interest.",
      body:
        "The path reflects your overall area of study. You can hold as many as you like at once, and each one carries its own certificate.",
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
      heading: "The person who recorded the lesson is named on it.",
      body:
        "Every lesson carries its instructor. You are never watching an anonymous screen recording — and when you have a question, there is somebody to ask.",
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
      /* ⚠ VERBATIM SCOTT. `transaction(s)` KEEPS ITS PARENTHETICAL PLURAL — a course may cover
         one transaction or several, and the parenthesis is the honest form. A terminal period was
         added to match every other heading on the page. */
      heading: "The course explains the application and its transaction(s).",
      body:
        "Each path is a handful of courses. A course is one application — what it is for, and every transaction you will actually run in it.",
      graphic: <CourseStepsShot />,
    },
    {
      /*
        ⚠ VERBATIM SCOTT, AND IT IS THE CATALOG'S OWN STRUCTURE RATHER THAN A DESCRIPTION OF IT.
        The live section stems are `1. Course Overview`, `2. Create New` (×30), `3. Find Existing`
        (×22) and `4. Change Existing` (×15) — Scott's sentence names three of the four in the
        order they appear.

        ⚠ DO NOT "IMPROVE" THE VERB LIST AND DO NOT ALPHABETISE IT. create/change/find is the
        sequence a practitioner actually works in, and it is his.
      */
      heading: "Lessons explain how to create, change, and find transactions.",
      body:
        "Short, recorded, and taught by the person who does this work. The lesson is the level where you actually learn the click path.",
      graphic: <LessonShot />,
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
      heading: "One test at the end of the path, and the certificate is verified by Panameer.",
      body:
        "The test covers the whole path, not a single course. Pass it and the credential is issued in your name — checkable by anyone you send it to.",
      graphic: <PathCertificateShot />,
    },
  ],
  5: [
    {
      /*
        ⚠ THIS ONE IS REAL AND ALREADY BUILT, so it is said plainly.
        `Certification.issued_from = LEARN` separates a Panameer-issued credential from a
        self-reported one, `learning_path_id` binds it to the path, `public_credential_url` holds
        `/verify/{id}`, the issuer writes both on a pass, and `app/verify/[credentialId]/page.tsx`
        exists. The LinkedIn/résumé claim is honest.

        ⚠ THE ROW LABEL IS AN INSTRUCTION THE LEARNER PERFORMS — `Add Certification to LinkedIn
        and Resume`. PANAMEER POSTS NOTHING. `deployment.md` records that LinkedIn's partner
        programs are approval-gated, and no integration exists or is planned here. Neither the
        label nor this copy may imply otherwise.

        ⚠ `P1-J3-E019` IS FIXED — THIS NOTE USED TO RECORD THE OPPOSITE AND WOULD OTHERWISE
        RE-TEACH THE OLD DEFECT. It said the issuer opened `if (!profile || !path) return null`
        and that `Certification.provider_profile_id` was NOT NULLABLE, so a learner with no
        provider profile passed the test and got nothing — no row, no credential, no verify
        page, no error. As of 2026-08-21 `Certification.user_id` is the owner, the profile link
        is nullable, and the issuer requires only the path. ⚠ A LEARNER WITH NO SELLER PROFILE
        NOW EARNS A REAL CREDENTIAL WITH A WORKING VERIFY URL.

        ⚠ THE COPY IS STILL NOT CHANGED HERE, AND THAT IS DELIBERATE. `P1-J0-E282`/`E283` are
        separate rows and still need Scott — the schema stopped lying, and rewriting the sentence
        is his call, not a consequence of the fix.
      */
      heading: "Your certificate publishes to your profile, with a link you can put anywhere.",
      body:
        "It lands the moment you earn it — on the same profile buyers search when they are hiring. The verification page is ours, so a recruiter clicking it is checking with us, not taking your word.",
      graphic: <ProfileCertificatesShot />,
    },
  ],
};

/**
 * ⚠ THE PANEL RENDERER, AND IT IS DELIBERATELY DUMB. It knows a block has a
 * heading, a body, a graphic and maybe an extra — nothing about which row it is
 * in. Row 3 gets two blocks for free, which is the only reason it can carry two
 * sections without a special case.
 */
function Panel({ blocks }: { blocks: PanelBlock[] }) {
  return (
    <>
      {blocks.map((b) => (
        <div className="stepd-block" key={b.heading}>
          <h2 className="stepd-h2">{b.heading}</h2>
          <p className="stepd-body">{b.body}</p>
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
const TIERS = [
  {
    tag: "Free",
    tagClass: "text-[#137a51]",
    title: "Connect — the course community",
    marker: null,
    sub: "Ask where you are stuck; the instructor is in the room.",
  },
  {
    tag: "Credits",
    tagClass: "text-[#7b2fd0]",
    title: "Group chat",
    marker: "earned",
    sub: "Entry comes from Community Credits, not a card.",
  },
  {
    tag: "Paid",
    tagClass: "text-magenta",
    title: "Book time one-to-one",
    marker: "soon",
    sub: "A reserved slot — you can count on talking to them at that time.",
  },
] as const;

function InstructorTiers() {
  return (
    <div className="mt-4">
      {TIERS.map((t) => (
        <div key={t.tag} className="flex items-start gap-3 border-t border-line py-3">
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
            <span className="mt-[2px] block text-[12px] leading-[1.45] text-ink-2">{t.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   THE ORIGINAL FIVE SELL SECTIONS — ⚠ BYTE-IDENTICAL. Do not edit, reorder, or add to this
   array; see the note at the top of the file about what the index derives.
   ──────────────────────────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    eyebrow: "Learning paths",
    heading: "Consultants use paths to raise what they can charge.",
    body:
      "A path is a sequence, not a shelf. Finish it and you have a certificate, a skill on your profile, and a specific answer when a buyer asks what you know.",
    graphic: <PathProgressShot />,
  },
  {
    eyebrow: "Free & certified",
    heading: "Anyone can learn a new skill and get certified — free.",
    body:
      "No tiers, no trial, no card. The certificate is verified by Panameer and it lands on your profile the moment you earn it.",
    graphic: <CertificateShot />,
  },
  {
    eyebrow: "Learn together",
    heading: "Every course has a room, and the instructor is in it.",
    body:
      "Ask where you are stuck and get an answer from the person who built the lesson — and from the several hundred people working through it alongside you.",
    graphic: <CohortRoomShot />,
  },
  {
    eyebrow: "One-on-one",
    heading: "Message an instructor when the group is not enough.",
    body:
      "Book a review, get your own configuration looked at, or keep a mentor on hand through a hard project. Some instructors include it with their path; others price it.",
    graphic: <MentorDmShot />,
  },
  {
    eyebrow: "Your brand",
    heading: "Instructors and students both build a name here.",
    body:
      "What you finish shows on your profile. What you teach shows too — with the learners you have taught and how they rate you. It is the same profile buyers search when they are hiring.",
    graphic: <LearnerProfileShot />,
  },
] as const;

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

        <div className="relative z-[2] mx-auto max-w-[1136px]">
          <h1 className="max-w-[900px] font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[900px]:text-[50px] min-[900px]:tracking-[-1px]">
            Get Trained, Get Certified, Get Hired, and Stay Supported
          </h1>
          {/*
            ⚠ VERBATIM SCOTT, `P1-J0-E280`, 2026-08-22. STILL NAMES ALL FOUR OBJECTS — path,
            course, lesson, certificate — which was `P1-J3-E011`'s point and survives this
            rewrite: the line before E011 said path · lesson · certificate and skipped COURSE,
            level 2 of the hierarchy the spine below exists to teach.

            ⚠⚠ `connect with the instructors` IS AN UNBUILT VERB, AND IT SHIPPED ANYWAY BECAUSE
            SCOTT WROTE IT. FLAGGED, NOT SILENTLY HARMONISED — this is the report, not a
            decision taken here.

            This comment used to say the opposite, and the history is the whole point. E011's
            sentence ended *"Message your instructor from within the course."* and that clause
            was HELD BACK under `P1-J3-E014`: there is no `Conversation`, `Message` or `Thread`
            model in the schema and `/messages` ships a `disabled` composer reading "Messaging
            isn't available yet". ⚠ NONE OF THAT HAS CHANGED. The same promise has now arrived
            through a different door, in different words, in the same paragraph it was removed
            from.

            ⚠ AND IT CONTRADICTS THE ROW BELOW IT. Step 2 is `Meet Your Instructor` PRECISELY
            because `Connect to the Instructor` overstates what exists — Scott settled that on
            the same day he wrote this sentence. The hero now promises the verb the row was
            renamed to avoid. ⚠ SCOTT DECIDES; do not resolve it by editing either one.

            ⚠ `3 minutes`, NOT `5` — `E243` was exactly this shape, two numbers for one signup on
            one page, and the tagline above says 3.

            ⚠ `Learning paths` KEEPS SCOTT'S CAPITAL L. `conventions.md` Title Case governs
            LABELS; this is prose and it is his.
          */}
          <p className="mt-5 max-w-[640px] text-[17px] leading-[1.6] text-[#cec7db] min-[900px]:text-[19px]">
            Enroll in Learning paths, connect with the instructors, take their courses, and
            watch their lessons. Create your account and start learning for free in the next 3
            minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login?callbackUrl=/learn"
              className="rounded-[12px] bg-magenta px-7 py-4 font-display text-[16px] font-bold text-white"
            >
              Create your free account
            </Link>
            <Link
              href="/learn/courses"
              className="rounded-[12px] border border-white/35 px-7 py-4 font-display text-[16px] font-bold text-white"
            >
              Browse the catalog
            </Link>
          </div>
          <p className="mt-5 max-w-[640px] text-[13px] text-white/65">
            Browsing works signed out. Paths, progress, certificates and instructors need an
            account.
          </p>
        </div>
        </section>
      </HeroBox>

      {/*
        ⚠ THE SECTION HEADING AND THE TAGLINE, ABOVE THE ROWS AND NOT A ROW — the
        shape `/optimize` ships and the question `E281` raised. `Here’s How It
        Works` used to be a whole `SellSection`; as a row it would have been a
        step that is not a step.

        ⚠ THE TAGLINE IS ONE SENTENCE AND SCOTT WROTE TWO. `for most learning
        paths` is HELD — it did not survive the live DB read (7 of 23 paths hold a
        publishable question set, ZERO are published). The reasoning and the exact
        counts are in `lib/learn-steps.ts`; it goes in unchanged the day the ratio
        is a majority. Same precedent as `P1-J3-E011` in the hero below.

        ⚠⚠ `SixStepShot` DRAWS SIX STEPS AND THIS PAGE NOW LISTS FIVE. FILED AS
        `P1-J0-E284` AND LEFT ALONE ON PURPOSE — whether it is redrawn,
        re-captioned or retired is Scott's call, and quietly dropping it here
        would delete art he approved rather than surface the contradiction.
      */}
      <section className="bg-white pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <h2 className="max-w-[900px] font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-[#171e3e] min-[900px]:text-[34px]">
            {LEARN_SPINE_HEADING}
          </h2>
          <p className="mt-3 max-w-[720px] text-[16.5px] leading-[1.62] text-[#7b8496]">
            {LEARN_SPINE_TAGLINE}
          </p>
          <div className="mt-9">
            <SixStepShot />
          </div>
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
          panel: <Panel blocks={PANELS[step.n]} />,
        }))}
      />

      {/*
        ⚠ ORDER IS SCOTT'S, AS MOCKED — do not reorder. Chat proposed leading with Free &
        Certified; his answer was to build what was drawn and edit from there.

        Even-numbered sections take the shade and put the graphic on the LEFT, which is the
        alternation the mockup draws. `SellSection` reverses with `order` rather than markup,
        so below 900px the text still leads in every section including these.
      */}
      {SECTIONS.map((s, i) => (
        <SellSection
          key={s.eyebrow}
          eyebrow={s.eyebrow}
          heading={s.heading}
          body={s.body}
          graphic={s.graphic}
          side={i % 2 === 1 ? "left" : "right"}
          shaded={i % 2 === 1}
        />
      ))}
    </>
  );
}
