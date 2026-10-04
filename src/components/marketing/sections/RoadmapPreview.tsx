import { ROADMAP_COPY, HOME_TEASER } from "@/lib/brand";
import { SectionCta } from "@/components/marketing/SectionCta";

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
              {}
              <h3 className="mt-2 text-[17px] font-bold">{s.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[#3a4266]">
                {s.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-[13px] text-[#6b7191]">{ROADMAP_COPY.note}</p>

        {}
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
