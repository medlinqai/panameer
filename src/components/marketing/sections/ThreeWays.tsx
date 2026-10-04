import { THREE_WAYS, HOME_TEASER } from "@/lib/brand";
import { SectionHead } from "@/components/marketing/sections/SectionHead";
import { SectionCta } from "@/components/marketing/SectionCta";

export function ThreeWays({ condensed = false }: { condensed?: boolean } = {}) {
  return (
    <section id="three-ways" className="bg-[#f6f4fb] py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <SectionHead
          eyebrow={condensed ? HOME_TEASER.eyebrow : THREE_WAYS.eyebrow}
          headline={condensed ? HOME_TEASER.headline : THREE_WAYS.headline}
          lead={condensed ? undefined : THREE_WAYS.lead}
        />

        <div className="mt-[34px] grid gap-4 md:grid-cols-3">
          {THREE_WAYS.ways.map((way) => {
            const featured = "badge" in way && Boolean(way.badge);
            return (
              <div
                key={way.title}
                className={
                  "relative rounded-[16px] bg-white px-6 py-[26px] " +
                  (featured
                    ? "border-2 border-magenta shadow-[0_18px_44px_rgba(215,44,214,0.15)]"
                    : "border border-line")
                }
              >
                {featured && (
                  <span className="absolute -top-3 right-[18px] rounded-full bg-magenta px-3 py-1 font-display text-[11px] font-bold uppercase tracking-[0.05em] text-white">
                    {way.badge}
                  </span>
                )}
                <p
                  className={
                    "font-display text-[12px] font-semibold uppercase tracking-[0.06em] " +
                    (featured ? "text-magenta" : "text-[#9aa0b8]")
                  }
                >
                  {way.tag}
                </p>
                <h3 className="mb-3 mt-2 text-[20px] text-ink">{way.title}</h3>
                <p className="mb-3 text-[14.5px] text-[#3a4266]">{way.blurb}</p>
                {/* The tick lists are the long half — dropped in the teaser. */}
                <ul className={condensed ? "hidden" : undefined}>
                  {way.points.map((pt) => (
                    <li
                      key={pt.text}
                      className="relative border-t border-dashed border-line py-1.5 pl-[22px] text-[13.5px] text-[#3a4266]"
                    >
                      <span
                        aria-hidden
                        className={
                          "absolute left-0 top-1.5 " +
                          (pt.ok ? "font-bold text-emerald-600" : "text-[#c98]")
                        }
                      >
                        {pt.ok ? "✓" : "–"}
                      </span>
                      {/* Spoken, so the list is not just ticks to a screen reader. */}
                      <span className="sr-only">{pt.ok ? "Included: " : "Not included: "}</span>
                      {pt.text}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {}
        {condensed && (
          <SectionCta variant="assessment" lead={HOME_TEASER.close} />
        )}
      </div>
    </section>
  );
}
