import Link from "next/link";
import { THREE_WAYS, HOME_TEASER } from "@/lib/brand";
import { SectionHead } from "@/components/marketing/sections/SectionHead";

/**
 * "Three Ways to Get the Work Done" — the honest comparison (buyer §2).
 *
 * ⚠ THE TONE RULE: NAME THE PATTERN, NEVER THE FIRM. The middle card is "Call a
 * Large Consultancy", not a logo, and its criticisms are structural — the
 * pyramid, the markup, the analyst on delivery — rather than about anybody in
 * particular. It also credits what that model genuinely gives you (risk
 * transfer, one contract), because a comparison where the alternative has no
 * upside reads as a sales sheet and gets discounted on sight.
 *
 * Presentational on Hire Talent: no links, because it is an argument and that
 * page's CTAs are the hero above it and the closing band below.
 *
 * ── TWO LENGTHS, ONE COMPONENT (brief_public_pages_ia WS-1) ──────────────────
 *
 * `condensed` is the home's teaser: the three cards without their tick lists,
 * and a closing line that hands off to Hire Talent. The full version stays on
 * Hire Talent, where a reader who has come to hire will actually read eighteen
 * comparison bullets.
 *
 * A PROP RATHER THAN A SECOND COMPONENT, because the argument has to be the
 * same argument in both places. Two hand-written versions of "here is how we
 * compare" drift, and the version nobody is looking at is the one that goes
 * stale — which is the one a prospect quotes back at you.
 */
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

        {/*
          THE TEASER CLOSES ON TALENT. Every value block on the home ends by
          pointing at the experts who do the work — that is the home's job, and
          a comparison that ends on its own cleverness is a dead end on a funnel
          page. The full version on Hire Talent needs no such line: the reader
          is already there.
        */}
        {condensed && (
          <p className="mt-8 text-[17px] font-semibold text-ink">
            {HOME_TEASER.close}{" "}
            <Link
              href="/hire-talent"
              className="text-magenta underline underline-offset-4 hover:text-magenta-dark"
            >
              {HOME_TEASER.closeCta} →
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
