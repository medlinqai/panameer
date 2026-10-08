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

/** ROW 2's THREE TIERS OF INSTRUCTOR ACCESS (was §7's, before the disclosures). */
/** REBUILT ON THE FREE-CONNECTION DECISION , 2026-08-24) */
const TIERS = [
  {
    tag: "Free",
    tagClass: "text-[#137a51]",
    title: "Ask the group",
    marker: null,
    // BUILDABLE TODAY — `ForumThread` / `ForumPost` exist in the schema. This is
    sub: "Other learners answer, in the path's community.",
  },
  {
    tag: "Free",
    tagClass: "text-[#137a51]",
    title: "Read what was asked of the instructor",
    marker: null,
    // NOBODY ANSWERS — THIS IS A READ, and saying so is the point. It is the
    sub: "Nobody answers this one — you are reading what already was.",
  },
  {
    tag: "Paid",
    tagClass: "text-magenta",
    title: "Book time one-to-one",
    // scheduling model, no `Conversation`/`Message` model.
    marker: "soon",
    // THE PAID TIER SELLS RESERVED TIME, NOT ACCESS — Scott: "i want to count on
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

// certificate panel folded UP into step 4, and step 4 draws `PathCertificateShot`

// The five sell sections it held — `Learning paths` · `Free & certified` ·

/** SEE-THROUGH CARDS, TRANSCRIBED FROM `/optimize` */
// ASYNC ( R4) — computed counts, and each label says what it counts.
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
      {/* BOXED, NOT FULL-BLEED */}
      <HeroBox cardClassName={HERO_CARD}>
        <section className="px-6 pb-[48px] pt-[44px] min-[901px]:pb-[72px] min-[901px]:pt-[64px]">
          {/* THE GRADIENT UNDER THIS IS NOT DECORATION AND MUST STAY. It paints before the clip */}
          <HeroVideoBackdrop
            src="/learn.mp4"
            poster="/posters/learn.svg"
            videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
            scrimClassName={HERO_SCRIM}
          />

          {/* TWO COLUMNS NOW, VIA THE SHARED `HeroTwoUp` . Scott, with */}
          <div className="relative z-[2] mx-auto max-w-[1136px]">
            <HeroTwoUp
              rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
              left={
                <>
                  {/* VERBATIM SCOTT, 2026-08-24 : *"Go from Zero to */}
                  <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                    Go from Zero to Hero…and Stay There
                  </h1>
                  {/* BOTH BUTTONS SURVIVE, AND IT IS A DECISION. Scott, 2026-08-24 */}
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    {/* SCOTT, 2026-08-26: *"The Start Learning for Free button? IF */}
                    <Link
                      href="/learn/paths"
                      className={HERO_BUTTON}
                    >
                      {LEARN_CTA_LABEL}
                    </Link>
                    <Link
                      href="/learn/paths"
                      className={HERO_BUTTON_OUTLINE}
                    >
                      Browse the Catalog
                    </Link>
                  </div>
                  {/* THE SIGNED-OUT FOOTNOTE IS GONE . Scott, 2026-08-24 */}
                </>
              }
              right={
                <>
                  {/* SCOTT-APPROVED, 2026-08-26 — NOT A DRAFT */}
                  {/* REVISED BY SCOTT 2026-08-26 amendment §3) */}
                <p className={HERO_DESC_CLASS}>
                  Click the &ldquo;{LEARN_CTA_LABEL}&rdquo; button and take Oracle
                  Cloud &amp; AI courses for free...all taught by the people who
                  deploy the systems.
                </p>
                  {/* WHITE, NOT PINK, AND THE TEXT IS `/optimize`'s . */}
                  {/* DECIDED IT. Scott said *"move both of these back to WHITE text"*. */}
                  {/* THE BRIDGE CLASS WAS THIS PAGE'S OWN — `text-[17px] … leading-[1.6] */}
                  <p className={HERO_BRIDGE_CLASS}>{HERO_BRIDGE_TEXT}</p>
                  <LearnStats />
                </>
              }
            />
          </div>
        </section>
      </HeroBox>

      {/* THE TWO STRINGS SWAP ROLES */}
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
