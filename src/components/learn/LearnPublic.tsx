import type { ReactNode } from "react";
import Link from "next/link";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { SellSection } from "@/components/marketing/SellSection";
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
 * ── ⚠ THE PAGE NOW HAS TWO VOICES, AND TWO ARRAYS, ON PURPOSE ────────────────
 *
 * `SPINE` (§2–§8) TEACHES: this is what a learning path is, this is what a course is, this is
 * where the certificate comes from. `SECTIONS` (the original five) SELLS. That is the same
 * division `/` makes, and it is why the instructional voice belongs above and would have been
 * wrong inside a sell section.
 *
 * ⚠⚠ THEY ARE TWO ARRAYS AND THEY MUST NEVER BECOME ONE. Both `.map`s derive `shaded` and
 * `side` from the index, so a section INSERTED INTO `SECTIONS` at index 0 flips the shade and
 * the graphic side of all five at once — the treatment Scott mocked and walked. The spine
 * renders as its own `.map` ABOVE, so `SECTIONS` is byte-identical to what it was and its five
 * sections keep their alternation. `brief_learn_public_spine` names this as the single thing
 * most likely to go wrong here.
 */

/* ────────────────────────────────────────────────────────────────────────────
   §2–§8 — THE TEACHING SPINE

   ⚠ ORDER, SHADE AND SIDE ARE THE APPROVED MOCKUP'S
   (`2. Claude Sub-Files/mockups/learn_public_spine_2026-08-21.html`), which alternates from an
   UNSHADED §2 — the same `i % 2 === 1` rule `SECTIONS` uses, applied to its own index space.

   ⚠ THREE STRINGS IN HERE ARE PLACEHOLDERS SCOTT IS REPLACING, and they are left EXACTLY as
   the mockup has them rather than polished: §2's heading, §2's body, and the tier wording in
   §7. The mockup marked them in yellow. A placeholder he recognises is worth more than a
   better sentence he has to hunt for, so no substitutions were made.
   ──────────────────────────────────────────────────────────────────────────── */
type SpineSection = {
  /** The numbered magenta disc. Only §3–§6 are sequenced steps; §2, §7 and §8 frame them. */
  step?: number;
  eyebrow: string;
  heading: string;
  body: string;
  graphic: ReactNode;
  /** Extra text-column content below the body. Only §7 uses it. */
  extra?: ReactNode;
};

const SPINE: SpineSection[] = [
  {
    eyebrow: "Here’s How It Works",
    /* ⚠ PLACEHOLDER — chat's words, not Scott's. Left verbatim as mocked. */
    heading: "Six steps, three levels, one certificate at the end of each path.",
    /* ⚠ PLACEHOLDER — chat's words, not Scott's. Left verbatim as mocked. */
    body:
      "A learning path is the unit you finish. Inside it are courses; inside those are lessons. Work down the levels, sit the path test, and the certificate is yours.",
    graphic: <SixStepShot />,
  },
  {
    step: 1,
    eyebrow: "Enroll in a Learning Path",
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
  {
    step: 2,
    eyebrow: "Take Each Course",
    /* ⚠ VERBATIM SCOTT. `transaction(s)` KEEPS ITS PARENTHETICAL PLURAL — a course may cover
       one transaction or several, and the parenthesis is the honest form. A terminal period was
       added to match every other heading on the page. */
    heading: "The course explains the application and its transaction(s).",
    body:
      "Each path is a handful of courses. A course is one application — what it is for, and every transaction you will actually run in it.",
    graphic: <CourseStepsShot />,
  },
  {
    step: 3,
    eyebrow: "Watch Each Lesson in the Course",
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
  {
    step: 4,
    /* ⚠ THE EXCLAMATION MARK IS SCOTT'S AND IT IS THE ONLY ONE ON THE PAGE. Keep it. */
    eyebrow: "Get Certified!",
    /*
      ⚠ NO COUNT, NO PATH NAME, NO "EVERY PATH" — deliberately, because the catalog cannot keep
      that promise yet. Measured 2026-08-20: 23 learning paths, 4 `LearnAssessment` rows, ALL
      FOUR `DRAFT`, so ZERO paths have a sittable test (`P1-J3-E004`/`E007`/`E008` plus the
      review gate that defaults `status` to DRAFT). This copy describes what a certificate IS
      and what it is worth, so it stays true as the catalog fills instead of needing a rewrite
      per path.
    */
    heading: "One test at the end of the path, and the certificate is verified by Panameer.",
    body:
      "The test covers the whole path, not a single course. Pass it and the credential is issued in your name — checkable by anyone you send it to.",
    graphic: <PathCertificateShot />,
  },
  {
    eyebrow: "While You Are Learning",
    /*
      ⚠ THE SUBJECT IS THE INSTRUCTOR, NOT MESSAGING, AND THAT SPLIT IS THE WHOLE POINT OF THE
      SECTION (`P1-J3-E014`).

      WHAT IS BUILT: 466 of 522 lessons carry an `expert_person_id`, teaching is recorded PER
      LESSON, a path's and a course's instructors are DERIVED from those, and real photos ship.
      So naming the person who recorded the lesson is TRUE TODAY and is written in the present
      tense.

      WHAT IS NOT BUILT: the verb. There is no `Conversation`, `Message` or `Thread` model
      anywhere in the schema, and `/messages` renders a `disabled` composer whose placeholder
      says "Messaging isn't available yet". So this section ships with NO MESSAGING COPY IN THE
      PRESENT TENSE and NO COMPOSER — the two tiers that need the verb are marked `earned` and
      `soon` in the tier list below.

      ⚠ THE FIVE SELL SECTIONS BELOW ALREADY PROMISE MESSAGING TWICE ("the instructor is in it",
      "Message an instructor when the group is not enough"). This section does not make it a
      third time. That pre-existing overselling is reported, not fixed here.
    */
    heading: "The person who recorded the lesson is named on it.",
    body:
      "Every lesson carries its instructor. You are never watching an anonymous screen recording — and when you have a question, there is somebody to ask.",
    graphic: <InstructorsShot />,
    extra: <InstructorTiers />,
  },
  {
    eyebrow: "What Do You Do After the Training",
    /*
      ⚠ THIS ONE IS REAL AND ALREADY BUILT, so it is said plainly.
      `Certification.issued_from = LEARN` separates a Panameer-issued credential from a
      self-reported one, `learning_path_id` binds it to the path, `public_credential_url` holds
      `/verify/{id}`, the issuer writes both on a pass, and `app/verify/[credentialId]/page.tsx`
      exists. The LinkedIn/résumé claim is honest.

      ⚠ AND IT DOES NOT SAY WHO GETS ONE — `P1-J3-E019`. The issuer opens
      `if (!profile || !path) return null` where `profile` is a `ProviderProfile`, and
      `Certification.provider_profile_id` is NOT NULLABLE. A learner with no provider profile
      passes the test and gets nothing: no row, no credential, no verify page, no error. So this
      copy is about what a verified credential IS and where it goes, and never about
      entitlement — no "anyone", no "you will". Not fixed here, by instruction; reported.
    */
    heading: "Your certificate publishes to your profile, with a link you can put anywhere.",
    body:
      "It lands the moment you earn it — on the same profile buyers search when they are hiring. The verification page is ours, so a recruiter clicking it is checking with us, not taking your word.",
    graphic: <ProfileCertificatesShot />,
  },
];

/**
 * §7's THREE TIERS OF INSTRUCTOR ACCESS.
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
      <section className="relative isolate overflow-hidden bg-[linear-gradient(150deg,#1b1f45_0%,#33194f_55%,#4a1a5e_100%)] px-6 py-16 text-white min-[900px]:py-[84px]">
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
            Learn it here. Get certified. Get hired.
          </h1>
          {/*
            ⚠ VERBATIM SCOTT, `P1-J3-E011`. NAMING ALL FOUR OBJECTS IS THE POINT — the previous
            line said path · lesson · certificate and skipped COURSE, which is level 2 of the
            hierarchy the spine below spends seven sections teaching.

            ⚠ HIS SENTENCE ENDED "Message your instructor from within the course." IT IS HELD
            BACK, NOT DROPPED. `P1-J3-E014`: there is no `Conversation`, `Message` or `Thread`
            model and `/messages` ships a `disabled` composer. It goes in the moment messaging
            does. ⚠ It is NOT paraphrased into something weaker — it is simply absent.

            ⚠ EM DASH, NOT A HYPHEN. The `<h1>` above is out of scope and unchanged.
          */}
          <p className="mt-5 max-w-[640px] text-[17px] leading-[1.6] text-[#cec7db] min-[900px]:text-[19px]">
            Every learning path, every course, every lesson, every certificate — all free.
            Create your account, login and get started for free in the next 5 minutes.
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

      {/*
        ⚠ THE SPINE'S OWN `.map`, ABOVE `SECTIONS` AND NEVER INSIDE IT. Its index space is its
        own, so its alternation starts unshaded at §2 without touching the five below.
      */}
      {SPINE.map((s, i) => (
        <SellSection
          key={s.eyebrow}
          eyebrow={s.eyebrow}
          heading={s.heading}
          body={s.body}
          graphic={s.graphic}
          step={s.step}
          side={i % 2 === 1 ? "left" : "right"}
          shaded={i % 2 === 1}
        >
          {s.extra}
        </SellSection>
      ))}

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
