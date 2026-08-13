import { ROADMAP_COPY, HOME_TEASER } from "@/lib/brand";
import { SectionCta } from "@/components/marketing/SectionCta";

/**
 * OUR METHOD — the section that proves this is a firm
 * (brief_home_polish_method WS-1).
 *
 * ── WHAT CHANGED, AND WHY IT MATTERS MORE THAN IT LOOKS ──────────────────────
 *
 * This was a roadmap PREVIEW: four phases, each naming an activity — "score and
 * prioritise", "close the quick wins". Read closely, that is a marketplace
 * describing what a buyer will end up doing. A firm's method produces
 * DELIVERABLES, so every card now names the thing the client receives: a
 * maturity read and a gap list, fixed-price packages with a named expert on
 * each, a scoped rebuild.
 *
 * The distinction is the positioning (`panameer_virtual_firm_identity.md`): a
 * marketplace has no point of view and leaves you to it; a firm has a method,
 * hands you outputs, and puts a human at the point of accountability. This is
 * the section where that claim is made or lost.
 *
 * ── THE LOOP IS THE PRODUCT ──────────────────────────────────────────────────
 *
 * The last card ties re-scoring to an alert when a new solution lands for one
 * of your gaps. A four-step plan that ENDS is a project, and a project is a
 * one-off; the alert is what makes "continuous transformation" a mechanism
 * rather than a tagline. It is also the honest description of the business — a
 * gap you cannot close today is a reason to come back, not a lost sale.
 *
 * ── THE COORDINATOR IS THE POINT ─────────────────────────────────────────────
 *
 * Everything above the coordinator line could plausibly be software. A named
 * senior person, assigned the moment the assessment completes, who translates
 * the read and stands behind the quality of the experts on the work, is what
 * makes this a firm rather than something that sold you a report. It is given
 * its own panel rather than a footnote for exactly that reason.
 *
 * ⚠ THE PAGE PROMISES THE COORDINATOR; assignment logic is a later build. That
 * is a promise about service, not a claim about shipped software — but it is
 * still a promise, and it needs to be true on the first assessment that
 * completes.
 */
export function RoadmapPreview() {
  return (
    <section id="method" className="border-t border-line bg-white py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-magenta">
          {ROADMAP_COPY.eyebrow}
        </p>
        <h2 className="max-w-[620px] text-balance text-[30px] font-semibold leading-[1.1] sm:text-[36px]">
          {ROADMAP_COPY.headline}
        </h2>
        <p className="mt-4 max-w-[600px] text-[16.5px] leading-relaxed text-[#3a4266]">
          {ROADMAP_COPY.lead}
        </p>

        <ol className="mt-9 grid gap-4 lg:grid-cols-4">
          {ROADMAP_COPY.steps.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-[16px] border border-line bg-canvas p-6"
            >
              {/* The connector, desktop only — decoration, so aria-hidden. */}
              {i < ROADMAP_COPY.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute right-[-10px] top-1/2 hidden h-px w-5 bg-line lg:block"
                />
              )}
              <p className="font-display text-[11.5px] font-semibold uppercase tracking-[0.14em] text-magenta">
                {s.phase}
              </p>
              {/*
                THE OUTPUT IS THE HEADING. `title` names the deliverable and the
                body says what is in it — so a reader skimming only the bold
                lines still reads a list of things they receive, which is the
                whole point of the rework.
              */}
              <h3 className="mt-2 text-[17px] font-bold">{s.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#3a4266]">
                {s.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-[13px] text-[#6b7191]">{ROADMAP_COPY.note}</p>

        {/*
          THE HUMAN ANCHOR. Its own panel, magenta-washed, directly under the
          method — because the method is the moat and the coordinator is the
          reason the method cannot be disintermediated. A line of body copy here
          would have read as a service detail; it is the argument.
        */}
        <div className="mt-8 rounded-[16px] border border-magenta/20 bg-magenta/[0.06] p-6">
          <p className="font-display text-[11.5px] font-semibold uppercase tracking-[0.14em] text-magenta">
            A person, not a bot
          </p>
          <p className="mt-2 max-w-[760px] text-[16px] leading-relaxed text-ink">
            {ROADMAP_COPY.coordinator}
          </p>
        </div>

        {/* Exit: the resourcing close. See SectionCta on why there are two. */}
        <SectionCta variant="experts" lead={HOME_TEASER.close} />
      </div>
    </section>
  );
}
