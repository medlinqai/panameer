import Link from "next/link";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { SellSection } from "@/components/marketing/SellSection";
import { PathProgressShot } from "@/components/learn/public/PathProgressShot";
import { CertificateShot } from "@/components/learn/public/CertificateShot";
import { CohortRoomShot } from "@/components/learn/public/CohortRoomShot";
import { MentorDmShot } from "@/components/learn/public/MentorDmShot";
import { LearnerProfileShot } from "@/components/learn/public/LearnerProfileShot";

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
 */
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
          <p className="mt-5 max-w-[640px] text-[17px] leading-[1.6] text-[#cec7db] min-[900px]:text-[19px]">
            Every path, every lesson, every certificate — free. Create an account to start,
            track what you finish, and put it on a profile buyers actually search.
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
