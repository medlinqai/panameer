import type { ReactNode } from "react";
import {
  HERO_BRIDGE_CLASS,
  HERO_BRIDGE_TEXT,
  HERO_BUTTON,
  HERO_BUTTON_OUTLINE,
  HERO_CARD,
  HERO_DESC_CLASS,
  HERO_SCRIM,
} from "@/components/marketing/hero-treatment";
import Link from "next/link";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { getCatalogCounts } from "@/lib/learn-catalog-counts";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import type { LearnStepLabel } from "@/lib/learn-steps";
import {
  LEARN_CTA_LABEL,
  LEARN_SPINE_HEADING,
  LEARN_SPINE_TAGLINE,
  LEARN_STEPS,
} from "@/lib/learn-steps";
import {
  EnrollShot,
  CourseStepsShot,
  PathCertificateShot,
  InstructorsShot,
} from "@/components/learn/public/spine-shots";

type PanelBlock = {
  heading: string;
  graphic: ReactNode;
  /** Extra content below the graphic. Only row 2 uses it, for `InstructorTiers`. */
  extra?: ReactNode;
};

const PANELS: Record<number, PanelBlock[]> = {
  1: [
    {
      heading:
        "Learning paths correspond to business processes and/or departments - select one or more based on your interests.",
      graphic: <EnrollShot />,
    },
  ],
  2: [
    {
      heading:
        "Connect with your instructor, join their community, and book one-on-one time for direct training or support.",
      graphic: <InstructorsShot />,
      extra: <InstructorTiers />,
    },
  ],
  3: [
    {
      heading:
        "Courses and lessons explain functional areas and applications as well as how to create, find and change transactions within those applications.",
      graphic: <CourseStepsShot />,
    },
  ],
  4: [
    {
      heading:
        "Each Learning path has its own test, and every certificate is verified, issued by Panameer, and published to your profile with a link you can put anywhere.",
      graphic: <PathCertificateShot />,
    },
  ],
  5: [
    {
      heading:
        "Months later, when the real problem lands, the group and the expert who taught you are still there.",
      graphic: <InstructorsShot />,
    },
  ],
};

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
          {}
          {i === 0 && (
            <p className="mb-3 font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
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

/* ⚠ `ProfileCertificatesShot` IS NO LONGER IMPORTED (`P1-J0-E322`). Step 5's
   certificate panel folded UP into step 4, and step 4 draws `PathCertificateShot`;
   step 5 now reuses `InstructorsShot`. The file stays on disk under the `E164`
   rule — it is the only drawing of a profile's certificate list. */

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
/* ⚠ ASYNC (`E606` R4) — computed counts, and each label says what it counts.
   ⚠⚠ THIS IS THE SURFACE THAT PRINTED 23 · 54 · 522 while `/learn/paths`
   printed 12 · 305. One definition now feeds both. */
async function LearnStats() {
  const counts = await getCatalogCounts();
  return (
    <dl className="mt-[26px] grid grid-cols-3 gap-[14px]">
      {counts.map((s) => (
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
      <HeroBox cardClassName={HERO_CARD}>
        <section className="px-6 pb-[48px] pt-[44px] min-[901px]:pb-[72px] min-[901px]:pt-[64px]">
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
            poster="/posters/learn.svg"
            videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
            scrimClassName={HERO_SCRIM}
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
                    {/*
                      ── ⚠⚠ `/learn/paths`, NOT `/login` (`P1-J3-E036`) ─────────────

                      SCOTT, 2026-08-26: *"The Start Learning for Free button? IF
                      LOGGED IN it shows you the learning paths...IF NOT it takes you
                      to a LOGIN or CREATE YOUR ACCOUNT page."*

                      ⚠ SUPERSEDED 2026-08-26, quoted not deleted:
                        *`href="/login?callbackUrl=/learn"`*
                      ⚠ THAT SENT A SIGNED-IN VISITOR TO A LOGIN PAGE AND BOUNCED THEM
                      BACK TO THE PAGE THEY WERE ALREADY ON. It only ever behaved
                      correctly for half the audience.

                      ⚠⚠ `LearnPublic` IS NOT MADE SESSION-AWARE TO FIX THIS, ON
                      PURPOSE. It reads no viewer today, and `learn/paths/page.tsx`
                      ALREADY branches on one — `getSessionViewer()` then
                      `getLearnHome(viewer.userId)`. The button points at that route
                      and lets it decide: signed in -> the paths; signed out -> the
                      login, with a callback back to the paths. One branch, one place.
                      ⚠ DO NOT ADD A BRANCH HERE.

                      ⚠ THE LABEL, CLASSES AND COLOUR ARE UNTOUCHED — this hero's AA
                      failure is `P1-J3-E033`, Scott's open decision, NOT this fix.
                    */}
                    <Link
                      href="/learn/paths"
                      className={HERO_BUTTON}
                    >
                      {LEARN_CTA_LABEL}
                    </Link>
                    <Link
                      href="/learn/courses"
                      className={HERO_BUTTON_OUTLINE}
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
                  ── ⚠⚠ SCOTT-APPROVED, 2026-08-26 (`P1-J3-E037`) — NOT A DRAFT ────

                  ⚠ CHAT'S MISS, NAMED: he approved this on 2026-08-26 and the brief
                  was never written. The separate question it raised — where the
                  button should go — WAS briefed and shipped (`P1-J3-E036`, `e88d26b`),
                  and the sentence itself was dropped on the floor. He found it still
                  wrong on the page.

                  ⚠ SUPERSEDED, quoted per convention:
                    *"Enroll in learning paths, connect with instructors, take
                     courses, get certified and get the support you need to stay
                     working."*

                  ⚠⚠ AND THE REPLACEMENT RETIRES TWO CLAIMS THE PRODUCT DOES NOT
                  KEEP. That is a consequence, not the reason — it is Scott's copy —
                  but it is worth recording that both leave this hero:
                    · `connect with instructors` — NO `Conversation`, `Message` or
                      `Thread` MODEL EXISTS; `/messages` ships a disabled composer
                      (`P1-J3-E014`). ⚠ IT SURVIVES ON THIS PAGE'S SPINE (step 2's
                      label AND its headline) and in step 5 (`E322`), so the count
                      goes 4 -> 2, not to zero. NOT TOUCHED HERE, by instruction.
                    · `get certified` — `P1-J3-E030`: 0 of 23 paths have a sittable
                      test, because the seven assessments are publishable and
                      unpublished (operational, not code). ⚠ IT SURVIVES in this
                      page's display headline (`certification in hours`, `E304`) and
                      in the spine. NOT TOUCHED HERE.

                  ⚠ `free` IS BACK IN THE HERO. `P1-J0-E295` asked for it to be
                  stressed here and `E321` had removed it entirely; this sentence says
                  it twice — the button name and the em-dash clause.

                  ⚠ `Oracle Cloud + AI` IS HIS PHRASING and agrees with the tagline
                  shipped in `cb39905`, which kept `Oracle`. ⚠ THE NAME RENDERS AS
                  TEXT. NO LOGO, EVER.
                  ⚠ CURLY QUOTES, EM DASH, AND THE QUESTION MARK IS HIS — all three
                  ship as typed. Do not "tidy" the question into a full stop.

                  ⚠ THE QUOTED LABEL IS `LEARN_CTA_LABEL` (`lib/learn-steps.ts`),
                  interpolated — never retyped. The button above reads the same
                  constant, and so does `check:ui`. One string, three consumers.

                  ⚠⚠ SUPERSEDED 2026-08-26 (`P1-J3-E038`) — the dead warning, quoted
                  not deleted, because it was TRUE when written and the debt it names
                  is what `E038` paid:
                    *"THE QUOTED LABEL IS TYPED TWICE — HERE AND ON THE BUTTON AT
                     `:870`. There is NO `LEARN_CTA_LABEL` constant and this brief was
                     explicitly one string, so one was NOT created. ⚠ THAT IS THE EXACT
                     DEFECT `P1-J1-E033` AND `P1-J4-E024` EXIST TO PREVENT — `/work`'s
                     button and sub-copy drifted apart that way. ⚠ IF EITHER STRING IS
                     EVER EDITED, EDIT BOTH, or extract the constant properly."*
                  ⚠ IT UNDERCOUNTED: there were THREE copies, not two — the spec held a
                  third at `e2e/marketing-home.spec.ts:1738`, which is the one that
                  drifts unnoticed. All three now read the constant.
                */}
                  {/*
                  ── ⚠⚠ REVISED BY SCOTT 2026-08-26 (`P1-ALL-E031` amendment §3) ──

                  ⚠ HE READ `E037`'s VERSION RENDERED AND REWROTE IT. This supersedes
                  `P1-J3-E037` (`3655436`), which was itself approved copy — so the
                  page has had three approved descriptions in three days.
                  ⚠ SUPERSEDED, quoted not deleted:
                    *"Click the “{LEARN_CTA_LABEL}” button, create your account, and
                     start on Oracle Cloud + AI — free, and taught by the people who
                     ran the systems. What are you waiting for?"*
                  ⚠ WHAT HE CHANGED: `&` not `+`, `courses` plural, HIS THREE-PERIOD
                  ELLIPSIS `...` and NOT `&hellip;`, `deploy` not `ran`, and the
                  question is gone. ⚠ `&` RENDERS AS `&amp;` IN JSX.
                  ⚠ THE LABEL IS INTERPOLATED FROM `LEARN_CTA_LABEL` (`P1-J3-E038`).
                  ⚠ `HERO_DESC_CLASS` carries the four-line `min-height`.
                */}
                <p className={HERO_DESC_CLASS}>
                  Click the &ldquo;{LEARN_CTA_LABEL}&rdquo; button and take Oracle
                  Cloud &amp; AI courses for free...all taught by the people who
                  deploy the systems.
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

                    ── ⚠⚠ PINK WAS ASKED FOR AGAIN ON 2026-08-25 AND MEASURED AGAIN,
                    AND IT STILL FAILS (`P1-J3-E031`) ─────────────────────────────

                    Scott: *"they all follow the same style.... meaning they are all
                    pink."* ⚠ IT WAS BUILT AND MEASURED, NOT ARGUED WITH.
                    `#efa3ee` at weight 600 over 9 sampled frames of `/learn.mp4`:

                        1440  3.04      900  4.34      390  4.21      (AA needs 4.50)

                    ⚠ FAILS AT ALL THREE WIDTHS — consistent with `E299`'s
                    3.09 / 4.19 / 4.06 the day before. So it is reproducible, not a
                    sampling artefact. `text-white` measures 5.76 / 7.86 / 7.57 and is
                    what stays.

                    ⚠⚠ AND NO FALLBACK WAS APPLIED, BY INSTRUCTION. Scott, 2026-08-25:
                    *"Do not pick a different pink, do not add a shadow, do not deepen
                    the scrim."* The brief's ladder authorised deepening the scrim;
                    HIS LATER MESSAGE WITHDREW THAT FOR THIS PAGE, so the scrim, the
                    video opacity and every colour here are untouched.

                    ⚠ THE REAL CHOICE IS NOW THE PINK OR THE CLIP, AND IT IS HIS.
                    `/hire-talent` DID get the pink in the same brief, at rung 2 of the
                    ladder over a different clip (4.16 -> 5.51). ⚠ SO THE TWO PAGES
                    DISAGREE ON BRIDGE-LINE COLOUR TODAY, and that is the reported
                    consequence of one page's footage being brighter than the other's.
                  */}
                  {/* ⚠ THE BRIDGE CLASS WAS THIS PAGE'S OWN — `text-[17px] … leading-[1.6]
                      min-[901px]:text-[19px]`, i.e. 17px below 901 where the other six
                      were a FIXED 19px/1.5. The TEXT was verbatim; the TREATMENT was not.
                      It takes `HERO_BRIDGE_CLASS` now (`P1-ALL-E031`) — reported, because
                      the brief believed six pages already matched and only five did. */}
                  <p className={HERO_BRIDGE_CLASS}>{HERO_BRIDGE_TEXT}</p>
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
            headline  34px / 700 / #272334 / ls -0.5px / lh 38.76px
                      / max-width 1040px / Comfortaa     (`.hiw-h2`)

        ⚠ TAILWIND, NOT THE CLASSES — both rules are `.pm-home`-scoped and this page
        is not inside that wrapper. Fourth instance of that trap today
        (`.sd-n`, `E290`, `E303`, here); checked against computed styles, not assumed.

        ⚠ `E302` REMOVED THE PINK SPAN FROM THE TAGLINE IN THE SAME PASS. A tagline
        promoted to a headline while still carrying an inline pink span would have
        been the worst of both.
      */}
      {}
      <section className="bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
            {LEARN_SPINE_HEADING}
          </p>
          {}
          {}
          <h2 className="mt-6 max-w-[1040px] text-wrap font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-[#272334] min-[900px]:text-[34px] min-[900px]:leading-[38.76px]">
            {LEARN_SPINE_TAGLINE}
          </h2>
        </div>
      </section>

      {}
      <StepDisclosures
        steps={LEARN_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: <Panel step={step} blocks={PANELS[step.n]} />,
        }))}
      />

      {}
    </>
  );
}
